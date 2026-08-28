from fastapi import APIRouter, Depends, HTTPException, status

from tabular_manner.engine.bootstrap import Engine

from app.core.engine import get_engine
from app.dependencies import get_owned_workspace
from app.nodes.policy import is_web_supported
from app.nodes.schemas import NodeLibraryOut, RegisterNodeRequest
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/nodes", tags=["nodes"])

def _drain(events) -> dict:
    result = None
    for event in events:
        result = event
    return result

@router.get("", response_model=NodeLibraryOut)
def list_nodes(workspace: Workspace = Depends(get_owned_workspace), engine: Engine = Depends(get_engine)):
    result = _drain(engine.node_library.describe_nodes(bucket=str(workspace.id)))
    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])

    registry = engine.registry_provider.get(str(workspace.id))
    data = result["data"]
    for group in ("builtin", "custom"):
        data[group] = [d for d in data[group] if is_web_supported(registry.get(d["type"]))]
        for descriptor in data[group]:
            descriptor["optional"].pop("bucket", None)
    return data

@router.post("", status_code=status.HTTP_201_CREATED)
def register_node(
    payload: RegisterNodeRequest,
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    result = _drain(
        engine.node_library.register_transform(
            payload.name, payload.expression, payload.description, bucket=str(workspace.id)
        )
    )
    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]

@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def unregister_node(
    name: str,
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    result = _drain(engine.node_library.unregister_node(name, bucket=str(workspace.id)))
    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])