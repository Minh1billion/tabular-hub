from fastapi import Depends

from app.core.exceptions import ForbiddenError
from app.dependencies import WorkspaceAccess, get_workspace_access
from app.workspace.models import ROLE_MEMBER, ROLE_OWNER, Workspace

RUN_ROLES = frozenset({ROLE_OWNER, ROLE_MEMBER})
HISTORY_ROLES = frozenset({ROLE_OWNER, ROLE_MEMBER})

def can_run_workflow(access: WorkspaceAccess) -> bool:
    return access.role in RUN_ROLES

def can_view_run_history(access: WorkspaceAccess) -> bool:
    return access.role in HISTORY_ROLES

def require_run_permission(access: WorkspaceAccess = Depends(get_workspace_access)) -> Workspace:
    if not can_run_workflow(access):
        raise ForbiddenError("Not allowed to run workflows in this workspace")
    return access.workspace

def require_history_access(access: WorkspaceAccess = Depends(get_workspace_access)) -> Workspace:
    if not can_view_run_history(access):
        raise ForbiddenError("Not allowed to view run history in this workspace")
    return access.workspace
