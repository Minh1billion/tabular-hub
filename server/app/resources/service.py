import os
import tempfile

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
