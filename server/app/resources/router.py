import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from tabular_manner.engine.bootstrap import Engine

from app.core import staging
from app.core.engine import get_engine
from app.database import get_db
from app.dependencies import get_owned_workspace
from app.resources import service
from app.resources.schemas import (
    ExportDownloadResponse,
    ExportResourceCreate,
    PresignUploadRequest,
    PresignUploadResponse,
    ResourceListResponse,
    ResourcePreviewResponse,
)
from app.run.schemas import RunRead
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/resources", tags=["resources"])

@router.post("/presign-upload", response_model=PresignUploadResponse, status_code=status.HTTP_201_CREATED)
def presign_upload(
    payload: PresignUploadRequest,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    run, post, staging_key = service.presign_upload(
        db,
        workspace=workspace,
        key=payload.key,
        filename=payload.filename,
        format=payload.format,
        overwrite=payload.overwrite,
        idempotency_key=payload.idempotency_key,
        content_length=payload.content_length,
    )
    return PresignUploadResponse(
        run_id=str(run.id), upload_url=post["url"], upload_fields=post["fields"], staging_key=staging_key
    )

@router.post("/{run_id}/confirm-upload", response_model=RunRead)
def confirm_upload(
    run_id: uuid.UUID,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    return service.confirm_upload(db, workspace=workspace, run_id=run_id)

@router.get("", response_model=ResourceListResponse)
def list_resources(workspace: Workspace = Depends(get_owned_workspace), engine: Engine = Depends(get_engine)):
    return service.list_resources(engine, bucket=str(workspace.id))

@router.get("/{key}", response_model=ResourcePreviewResponse)
def preview_resource(
    key: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    return service.preview_resource(engine, str(workspace.id), key, limit, offset)

@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    key: str,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
    engine: Engine = Depends(get_engine),
):
    service.delete_resource(db, engine, str(workspace.id), key)

@router.post("/{key}/export", response_model=RunRead, status_code=status.HTTP_202_ACCEPTED)
def export_resource(
    key: str,
    payload: ExportResourceCreate,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    return service.export_resource(
        db, workspace=workspace, key=key, format=payload.format, idempotency_key=payload.idempotency_key
    )

@router.get("/{key}/export/{run_id}/download", response_model=ExportDownloadResponse)
def download_export(
    key: str,
    run_id: uuid.UUID,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    return ExportDownloadResponse(download_url=service.get_export_download_url(db, workspace=workspace, run_id=run_id))


staging_router = APIRouter(prefix="/staging", tags=["staging"])


@staging_router.post("/{staging_key:path}", status_code=status.HTTP_204_NO_CONTENT)
async def post_staging_file(staging_key: str, file: UploadFile = File(...)):
    if not staging.is_local():
        raise HTTPException(status_code=404, detail="Local staging disabled")
    dest = staging.local_path(staging_key)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)


@staging_router.put("/{staging_key:path}")
async def upload_staging_file(staging_key: str, request: Request):
    if not staging.is_local():
        raise HTTPException(status_code=404, detail="Local staging disabled")
    dest = staging.local_path(staging_key)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as f:
        async for chunk in request.stream():
            f.write(chunk)
    return Response(status_code=status.HTTP_200_OK)


@staging_router.get("/{staging_key:path}")
def download_staging_file(staging_key: str, filename: str | None = Query(None)):
    if not staging.is_local():
        raise HTTPException(status_code=404, detail="Local staging disabled")
    target = staging.local_path(staging_key)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Staging file not found")
    return FileResponse(path=target, filename=filename or target.name, media_type="application/octet-stream")
