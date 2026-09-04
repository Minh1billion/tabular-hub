import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from tabular_manner.engine.bootstrap import Engine

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
    run, upload_url, staging_key = service.presign_upload(
        db,
        workspace=workspace,
        key=payload.key,
        filename=payload.filename,
        format=payload.format,
        overwrite=payload.overwrite,
        idempotency_key=payload.idempotency_key,
    )
    return PresignUploadResponse(run_id=str(run.id), upload_url=upload_url, staging_key=staging_key)

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
