import json
import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from tabular_manner.engine.bootstrap import Engine

from app.core.engine import get_engine
from app.core.exceptions import NotFoundError
from app.core.queue import enqueue_run, request_cancel, subscribe_run_events
from app.database import get_db
from app.dependencies import get_owned_workspace
from app.shared.spec import assert_web_supported_nodes, strip_bucket_params
from app.run import service
from app.run.schemas import RunCreate, RunEventRead, RunRead, ValidateRequest, ValidateResponse
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/runs", tags=["runs"])

@router.post("", response_model=RunRead, status_code=status.HTTP_201_CREATED)
def create(
    payload: RunCreate,
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
    db: Session = Depends(get_db),
):
    spec = strip_bucket_params(payload.spec)
    assert_web_supported_nodes(spec, engine.registry_provider.get(str(workspace.id)))
    run = service.create_run(db, workspace=workspace, spec=spec, idempotency_key=payload.idempotency_key)
    if run.status == "queued":
        enqueue_run(str(run.id))
    return run

@router.post("/validate", response_model=ValidateResponse)
def validate(
    payload: ValidateRequest,
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    spec = strip_bucket_params(payload.spec)
    assert_web_supported_nodes(spec, engine.registry_provider.get(str(workspace.id)))
    result = None
    for event in engine.execution.validate(spec, bucket=str(workspace.id)):
        result = event
    if result["event"] == "failed":
        errors = result.get("errors")
        if errors is None:
            errors = [{"node_id": result.get("node_id"), "node_type": result.get("node_type"), "message": result["error"]}]
        return ValidateResponse(valid=False, errors=errors)
    return ValidateResponse(valid=True, errors=[])

@router.get("", response_model=list[RunRead])
def list_(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    return service.list_runs(db, workspace_id=workspace.id, limit=limit, offset=offset)

@router.get("/{run_id}", response_model=RunRead)
def get(
    run_id: uuid.UUID,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    run = service.get_run(db, workspace_id=workspace.id, run_id=run_id)
    if run is None:
        raise NotFoundError("Run not found")
    return run

@router.post("/{run_id}/cancel", response_model=RunRead)
def cancel(
    run_id: uuid.UUID,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    run = service.get_run(db, workspace_id=workspace.id, run_id=run_id)
    if run is None:
        raise NotFoundError("Run not found")

    run = service.request_cancel_run(db, run=run)
    if run.status == "cancelling":
        request_cancel(str(run.id))
    return run

@router.get("/{run_id}/events/history", response_model=list[RunEventRead])
def event_history(
    run_id: uuid.UUID,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    run = service.get_run(db, workspace_id=workspace.id, run_id=run_id)
    if run is None:
        raise NotFoundError("Run not found")
    return service.list_run_events(db, run_id=run_id)

@router.get("/{run_id}/events")
async def stream_events(
    run_id: uuid.UUID,
    request: Request,
    workspace: Workspace = Depends(get_owned_workspace),
    db: Session = Depends(get_db),
):
    run = service.get_run(db, workspace_id=workspace.id, run_id=run_id)
    if run is None:
        raise NotFoundError("Run not found")

    async def event_source():
        pubsub = await subscribe_run_events(str(run_id))
        try:
            while True:
                if await request.is_disconnected():
                    break
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=15)
                if message is None:
                    yield ": keep-alive\n\n"
                    continue
                yield f"data: {message['data']}\n\n"
                event_name = json.loads(message["data"]).get("event")
                if event_name in ("completed", "failed", "cancelled"):
                    break
        finally:
            await pubsub.unsubscribe(f"run:{run_id}")
            await pubsub.aclose()

    return StreamingResponse(event_source(), media_type="text/event-stream")