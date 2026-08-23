import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.data import service
from app.data.schemas import (
    ImportResourceRequest,
    ImportResourceResponse,
    ResourceListResponse,
    ResourcePreviewResponse,
)
from app.database import get_db
from app.dependencies import get_owned_workspace
from app.workspace.models import Workspace

router = APIRouter(prefix="/workspaces/{workspace_id}/resources", tags=["resources"])

@router.post("", response_model=ImportResourceResponse, status_code=status.HTTP_201_CREATED)
def import_resource(
    workspace_id: uuid.UUID,
    payload: ImportResourceRequest,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    data = service.import_resource(
        workspace_id,
        db,
        key=payload.key,
        source_kind=payload.source_kind,
        source_params=payload.source_params,
        overwrite=payload.overwrite,
    )
    return ImportResourceResponse(**data)

@router.get("", response_model=ResourceListResponse)
def list_resources(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    data = service.list_resources(workspace_id, db)
    return ResourceListResponse(keys=data["keys"])

@router.get("/{key}", response_model=ResourcePreviewResponse)
def get_resource(
    workspace_id: uuid.UUID,
    key: str,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    data = service.get_resource(workspace_id, db, key, limit, offset)
    return ResourcePreviewResponse(**data)

@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    workspace_id: uuid.UUID,
    key: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_owned_workspace),
):
    service.delete_resource(workspace_id, db, key)