import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from tabular_manner.engine.bootstrap import Engine

from app.config import settings
from app.core.engine import get_engine
from app.core.exceptions import PayloadTooLargeError
from app.core.queue import enqueue_run
from app.database import get_db
from app.dependencies import get_owned_workspace
from app.resources.schemas import ResourceListResponse, ResourcePreviewResponse
from app.run import service as run_service
from app.run.schemas import RunRead
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/resources", tags=["resources"])

def _drain(events) -> dict:
    result = None
    for event in events:
        result = event
    return result

async def _write_upload_to_tmp(file: UploadFile, suffix: str) -> str:
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    written = 0
    with os.fdopen(fd, "wb") as tmp:
        while chunk := await file.read(settings.UPLOAD_CHUNK_SIZE_BYTES):
            written += len(chunk)
            if written > settings.MAX_UPLOAD_SIZE_BYTES:
                os.remove(tmp_path)
                raise PayloadTooLargeError(
                    f"File exceeds max upload size of {settings.MAX_UPLOAD_SIZE_BYTES} bytes"
                )
            tmp.write(chunk)
    return tmp_path

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
    tmp_path = await _write_upload_to_tmp(file, suffix)

    run = run_service.create_run(
        db,
        workspace=workspace,
        spec={"key": key, "format": format, "overwrite": overwrite, "path": tmp_path},
        idempotency_key=idempotency_key,
        kind="import",
    )
    if run.status == "queued":
        enqueue_run(str(run.id))
    return run

@router.get("", response_model=ResourceListResponse)
def list_resources(workspace: Workspace = Depends(get_owned_workspace), engine: Engine = Depends(get_engine)):
    result = _drain(engine.data_resource.list(bucket=str(workspace.id)))
    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])
    return {"keys": result["data"]["keys"]}

@router.get("/{key}", response_model=ResourcePreviewResponse)
def preview_resource(
    key: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    result = _drain(engine.data_resource.get(key, bucket=str(workspace.id), limit=limit, offset=offset))
    if result["event"] == "failed":
        raise HTTPException(status_code=404, detail=result["error"])
    return result["data"]

@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    key: str,
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    result = _drain(engine.data_resource.delete(key, bucket=str(workspace.id)))
    if result["event"] == "failed":
        raise HTTPException(status_code=404, detail=result["error"])