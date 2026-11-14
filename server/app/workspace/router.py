import logging
import uuid

from fastapi import APIRouter, Depends, status
from fastapi.concurrency import run_in_threadpool
from redis.exceptions import RedisError
from sqlalchemy.orm import Session
from tabular_manner.engine.bootstrap import Engine

from app.auth.models import User
from app.collab import store as collab_store
from app.collab.hub import hub
from app.core.engine import get_engine
from app.core.exceptions import ForbiddenError, ServiceUnavailableError
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

logger = logging.getLogger(__name__)

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
async def update(
    payload: WorkspaceUpdate,
    access: WorkspaceAccess = Depends(get_workspace_access),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.name is not None and not access.is_owner:
        raise ForbiddenError("Only the workspace owner can rename this workspace")

    workspace_id = access.workspace.id
    actor_id = current_user.id
    locks: dict[tuple[str, str], str] = {}
    if payload.spec is not None:
        try:
            locks = await collab_store.locks_by_element(workspace_id)
        except RedisError as exc:
            raise ServiceUnavailableError("Collaboration service unavailable, try again shortly") from exc

    def save():
        workspace = service.update_workspace(
            db,
            workspace=access.workspace,
            name=payload.name,
            spec=payload.spec,
            base_version=payload.base_version,
            locks=locks,
            actor_id=actor_id,
        )
        return service.to_read(workspace, access.role)

    result = await run_in_threadpool(save)

    if payload.spec is not None:
        try:
            await hub.publish_spec_updated(
                workspace_id, version=result.spec_version, spec=result.spec, actor_id=str(actor_id)
            )
        except RedisError:
            logger.exception("Failed to publish spec update for workspace %s", workspace_id)
    return result

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
async def remove_member(
    user_id: uuid.UUID,
    workspace: Workspace = Depends(get_owner_workspace),
    db: Session = Depends(get_db),
):
    workspace_id = workspace.id
    await run_in_threadpool(service.remove_member, db, workspace=workspace, user_id=user_id)
    try:
        await hub.evict_member(workspace_id, user_id)
    except RedisError:
        logger.exception("Failed to evict member %s from workspace %s", user_id, workspace_id)

@router.delete("/{workspace_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(
    invitation_id: uuid.UUID,
    workspace: Workspace = Depends(get_owner_workspace),
    db: Session = Depends(get_db),
):
    service.revoke_invitation(db, workspace=workspace, invitation_id=invitation_id)
