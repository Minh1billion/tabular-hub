import json
import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_owned_workspace
from app.node import service
from app.node.schemas import (
    CustomNodeRead,
    ExecuteGraphRequest,
    NodeCatalogResponse,
    RegisterTransformNodeRequest,
    ValidateGraphRequest,
    ValidateGraphResponse,
)
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/nodes", tags=["nodes"])

@router.get("/catalog", response_model=NodeCatalogResponse)
def catalog(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    return service.get_catalog(workspace_id, db)

@router.post("/custom", response_model=CustomNodeRead, status_code=status.HTTP_201_CREATED)
def register_custom_node(
    workspace_id: uuid.UUID,
    payload: RegisterTransformNodeRequest,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    return service.register_transform(workspace_id, db, payload)

@router.get("/custom/{name}", response_model=CustomNodeRead)
def get_custom_node(
    workspace_id: uuid.UUID,
    name: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    return service.get_custom_node(workspace_id, db, name)

@router.delete("/custom/{name}", status_code=status.HTTP_204_NO_CONTENT)
def unregister_custom_node(
    workspace_id: uuid.UUID,
    name: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    service.unregister_custom_node(workspace_id, db, name)

@router.post("/validate", response_model=ValidateGraphResponse)
def validate(
    workspace_id: uuid.UUID,
    payload: ValidateGraphRequest,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    return service.validate_graph(workspace_id, db, payload)

@router.post("/execute")
async def execute(
    workspace_id: uuid.UUID,
    payload: ExecuteGraphRequest,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    async def stream():
        async for event in service.execute_graph(workspace_id, db, payload):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
