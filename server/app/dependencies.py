import uuid
from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import decode_access_token
from app.database import get_db
from app.workspace.models import ROLE_MEMBER, ROLE_OWNER, Workspace, WorkspaceMember

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise UnauthorizedError("Not authenticated")

    user_id = decode_access_token(token)
    if not user_id:
        raise UnauthorizedError("Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedError("User not found")

    return user

@dataclass(frozen=True)
class WorkspaceAccess:
    workspace: Workspace
    role: str

    @property
    def is_owner(self) -> bool:
        return self.role == ROLE_OWNER

def resolve_workspace_access(db: Session, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceAccess:
    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        .first()
    )
    if not workspace:
        raise NotFoundError("Workspace not found")
    if workspace.owner_id == user_id:
        return WorkspaceAccess(workspace=workspace, role=ROLE_OWNER)

    is_member = (
        db.query(WorkspaceMember.id)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id)
        .first()
        is not None
    )
    if not is_member:
        raise ForbiddenError("Not allowed to access this workspace")
    return WorkspaceAccess(workspace=workspace, role=ROLE_MEMBER)

def get_workspace_access(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkspaceAccess:
    return resolve_workspace_access(db, workspace_id, current_user.id)

def get_accessible_workspace(access: WorkspaceAccess = Depends(get_workspace_access)) -> Workspace:
    return access.workspace

def get_owner_workspace(access: WorkspaceAccess = Depends(get_workspace_access)) -> Workspace:
    if not access.is_owner:
        raise ForbiddenError("Only the workspace owner can do this")
    return access.workspace
