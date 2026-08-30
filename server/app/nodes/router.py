from fastapi import APIRouter, Depends, status

from tabular_manner.engine.bootstrap import Engine

from app.core.engine import get_engine
from app.dependencies import get_owned_workspace
from app.nodes import service
from app.nodes.schemas import NodeLibraryOut, RegisterNodeRequest
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/nodes", tags=["nodes"])

@router.get("", response_model=NodeLibraryOut)
def list_nodes(workspace: Workspace = Depends(get_owned_workspace), engine: Engine = Depends(get_engine)):
    return service.list_nodes(engine, bucket=str(workspace.id))

@router.post("", status_code=status.HTTP_201_CREATED)
def register_node(
    payload: RegisterNodeRequest,
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    return service.register_node(engine, str(workspace.id), payload.name, payload.expression, payload.description)

@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def unregister_node(
    name: str,
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    service.unregister_node(engine, str(workspace.id), name)
