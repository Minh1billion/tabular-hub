import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from tabular_manner.engine.bootstrap import Engine

from app.core import staging
from app.core.engine import drain_events
from app.core.queue import enqueue_run
from app.run import service as run_service
from app.run.models import Run
from app.workspace.models import Workspace

def presign_upload(
    db: Session, *, workspace: Workspace, key: str, filename: str, format: str, overwrite: bool, idempotency_key: str
) -> tuple[Run, str, str]:
    staging_key = staging.new_key(str(workspace.id), filename)
    run = run_service.create_run(
        db,
        workspace=workspace,
        spec={"key": key, "format": format, "overwrite": overwrite, "staging_key": staging_key},
        idempotency_key=idempotency_key,
        kind="import",
        status="pending_upload",
    )
    upload_url = staging.presign_put(staging_key)
    return run, upload_url, staging_key

def confirm_upload(db: Session, *, workspace: Workspace, run_id: uuid.UUID) -> Run:
    run = run_service.get_run(db, workspace_id=workspace.id, run_id=run_id)
    if run is None or run.kind != "import":
        raise HTTPException(status_code=404, detail="Import run not found")
    if not staging.exists(run.spec["staging_key"]):
        raise HTTPException(status_code=400, detail="Upload not found in staging")
    run = run_service.mark_queued(db, run=run)
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
    staging_key = staging.new_key(str(workspace.id), f"{key}.{format}")
    run = run_service.create_run(
        db,
        workspace=workspace,
        spec={"key": key, "format": format, "staging_key": staging_key},
        idempotency_key=idempotency_key,
        kind="export",
    )
    if run.status == "queued":
        enqueue_run(str(run.id))
    return run

def get_export_download_url(db: Session, *, workspace: Workspace, run_id: uuid.UUID) -> str:
    run = run_service.get_run(db, workspace_id=workspace.id, run_id=run_id)
    if run is None or run.kind != "export":
        raise HTTPException(status_code=404, detail="Export not found")
    if run.status != "completed":
        raise HTTPException(status_code=409, detail=f"Export is {run.status}")
    filename = f"{run.spec['key']}.{run.spec['format']}"
    return staging.presign_get(run.spec["staging_key"], filename)