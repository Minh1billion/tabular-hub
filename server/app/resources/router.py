import os
import uuid

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from sqlalchemy.orm import Session

from tabular_manner.engine.bootstrap import Engine

from app.core.engine import get_engine
from app.database import get_db
from app.dependencies import get_owned_workspace
from app.resources import service
from app.resources.schemas import ExportResourceCreate, ResourceListResponse, ResourcePreviewResponse
from app.run.schemas import RunRead
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/resources", tags=["resources"])

@router.post("", response_model=RunRead, status_code=status.HTTP_202_ACCEPTED)
async def import_resource(
    key: str = Form(...),
    format: str = Form("csv"),
    overwrite: bool = Form(False),
    idempotency_key: str = Form(...),
    file: UploadFile = File(...),
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    suffix = os.path.splitext(file.filename or "")[1] or f".{format}"
    tmp_path = await service.write_upload_to_tmp(file, suffix)
    return service.import_resource(
        db,
        workspace=workspace,
        key=key,
        format=format,
        overwrite=overwrite,
        tmp_path=tmp_path,
        idempotency_key=idempotency_key,
    )

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
    engine: Engine = Depends(get_engine),
):
    service.delete_resource(engine, str(workspace.id), key)

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

@router.get("/{key}/export/{run_id}/download")
def download_export(
    key: str,
    run_id: uuid.UUID,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    run = service.get_export_run(db, workspace=workspace, run_id=run_id)
    path = run.spec["path"]
    return FileResponse(path, filename=f"{key}.{run.spec['format']}", background=BackgroundTask(os.remove, path))