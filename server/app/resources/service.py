import os
import tempfile
import time
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from tabular_manner.engine.bootstrap import Engine

from app.config import settings
from app.core.engine import drain_events
from app.core.exceptions import PayloadTooLargeError
from app.core.queue import enqueue_run
from app.run import service as run_service
from app.run.models import Run
from app.workspace.models import Workspace

async def write_upload_to_tmp(file: UploadFile, suffix: str) -> str:
    upload_dir = os.path.join(settings.ENGINE_STORAGE_ROOT, "_uploads")
    os.makedirs(upload_dir, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(suffix=suffix, dir=upload_dir)
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

def import_resource(
    db: Session, *, workspace: Workspace, key: str, format: str, overwrite: bool, tmp_path: str, idempotency_key: str
) -> Run:
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

def list_resources(engine: Engine, bucket: str) -> dict:
    result = drain_events(engine.data_resource.list(bucket=bucket))
    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])
    return {"keys": result["data"]["keys"]}

def preview_resource(engine: Engine, bucket: str, key: str, limit: int, offset: int) -> dict:
    result = drain_events(engine.data_resource.get(key, bucket=bucket, limit=limit, offset=offset))
    if result["event"] == "failed":
        raise HTTPException(status_code=404, detail=result["error"])
    return result["data"]

def delete_resource(engine: Engine, bucket: str, key: str) -> None:
    result = drain_events(engine.data_resource.delete(key, bucket=bucket))
    if result["event"] == "failed":
        raise HTTPException(status_code=404, detail=result["error"])

def export_resource(db: Session, *, workspace: Workspace, key: str, format: str, idempotency_key: str) -> Run:
    export_dir = os.path.join(settings.ENGINE_STORAGE_ROOT, "_exports")
    os.makedirs(export_dir, exist_ok=True)
    dest_path = os.path.join(export_dir, f"{uuid.uuid4()}.{format}")
    run = run_service.create_run(
        db,
        workspace=workspace,
        spec={"key": key, "format": format, "path": dest_path},
        idempotency_key=idempotency_key,
        kind="export",
    )
    if run.status == "queued":
        enqueue_run(str(run.id))
    return run

def get_export_run(db: Session, *, workspace: Workspace, run_id: uuid.UUID) -> Run:
    run = run_service.get_run(db, workspace_id=workspace.id, run_id=run_id)
    if run is None or run.kind != "export":
        raise HTTPException(status_code=404, detail="Export not found")
    if run.status != "completed":
        raise HTTPException(status_code=409, detail=f"Export is {run.status}")
    return run

def sweep_expired_exports() -> None:
    export_dir = os.path.join(settings.ENGINE_STORAGE_ROOT, "_exports")
    if not os.path.isdir(export_dir):
        return
    cutoff = time.time() - settings.EXPORT_TTL_SECONDS
    for name in os.listdir(export_dir):
        path = os.path.join(export_dir, name)
        if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
            os.remove(path)