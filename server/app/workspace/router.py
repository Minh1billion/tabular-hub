import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from tabular_manner.engine.bootstrap import Engine

from app.auth.models import User
from app.core.engine import get_engine
from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.dependencies import WorkspaceAccess, get_current_user, get_owner_workspace, get_workspace_access
from app.workspace import service
from app.workspace.models import Workspace
from app.workspace.schemas import (
    InviteResult,
    MemberInvite,
    WorkspaceCreate,
    WorkspaceListItem,
    WorkspaceMembersRead,
    WorkspaceRead,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create(
    payload: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.create_workspace(db, owner_id=current_user.id, name=payload.name)

@router.get("", response_model=list[WorkspaceListItem])
def list_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.list_workspaces(db, user_id=current_user.id)

@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get(
    access: WorkspaceAccess = Depends(get_workspace_access),
    db: Session = Depends(get_db),
):
    workspace = access.workspace
    if access.is_owner:
        workspace = service.touch_workspace(db, workspace)
    return service.to_read(workspace, access.role)

@router.patch("/{workspace_id}", response_model=WorkspaceRead)
def update(
    payload: WorkspaceUpdate,
    access: WorkspaceAccess = Depends(get_workspace_access),
    db: Session = Depends(get_db),
):
    if payload.name is not None and not access.is_owner:
        raise ForbiddenError("Only the workspace owner can rename this workspace")
    workspace = service.update_workspace(db, workspace=access.workspace, name=payload.name, spec=payload.spec)
    return service.to_read(workspace, access.role)

@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    workspace: Workspace = Depends(get_owner_workspace),
    db: Session = Depends(get_db),
    engine: Engine = Depends(get_engine),
):
    service.delete_workspace(db, workspace=workspace, engine=engine)

@router.get("/{workspace_id}/members", response_model=WorkspaceMembersRead)
def list_members(
    workspace: Workspace = Depends(get_owner_workspace),
    db: Session = Depends(get_db),
):
    return service.list_members(db, workspace=workspace)

@router.post("/{workspace_id}/members", response_model=InviteResult, status_code=status.HTTP_201_CREATED)
def invite_member(
    payload: MemberInvite,
    workspace: Workspace = Depends(get_owner_workspace),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.invite_member(db, workspace=workspace, inviter=current_user, email=payload.email)

@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    user_id: uuid.UUID,
    workspace: Workspace = Depends(get_owner_workspace),
    db: Session = Depends(get_db),
):
    service.remove_member(db, workspace=workspace, user_id=user_id)

@router.delete("/{workspace_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(
    invitation_id: uuid.UUID,
    workspace: Workspace = Depends(get_owner_workspace),
    db: Session = Depends(get_db),
):
    service.revoke_invitation(db, workspace=workspace, invitation_id=invitation_id)
