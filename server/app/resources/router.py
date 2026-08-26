import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from tabular_manner.engine.bootstrap import Engine

from app.core.engine import get_engine
from app.dependencies import get_owned_workspace
from app.resources.schemas import ResourceImportResponse, ResourceListResponse, ResourcePreviewResponse
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/resources", tags=["resources"])

def _drain(events) -> dict:
    result = None
    for event in events:
        result = event
    return result

@router.post("", response_model=ResourceImportResponse, status_code=status.HTTP_201_CREATED)
async def import_resource(
    key: str = Form(...),
    format: str = Form("csv"),
    overwrite: bool = Form(False),
    file: UploadFile = File(...),
    workspace: Workspace = Depends(get_owned_workspace),
    engine: Engine = Depends(get_engine),
):
    suffix = os.path.splitext(file.filename or "")[1] or f".{format}"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        result = _drain(
            engine.data_resource.import_source(
                key=key,
                source_kind="file",
                source_params={"path": tmp_path, "format": format},
                bucket=str(workspace.id),
                overwrite=overwrite,
            )
        )
    finally:
        os.remove(tmp_path)

    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]

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