import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError
from app.workspace.models import Workspace

def create_workspace(db: Session, *, owner_id: uuid.UUID, name: str) -> Workspace:
    workspace = Workspace(name=name, owner_id=owner_id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace

def list_workspaces(db: Session, *, owner_id: uuid.UUID) -> list[Workspace]:
    return (
        db.query(Workspace)
        .filter(Workspace.owner_id == owner_id, Workspace.deleted_at.is_(None))
        .order_by(Workspace.created_at.desc())
        .all()
    )

def get_workspace(db: Session, *, owner_id: uuid.UUID, workspace_id: uuid.UUID) -> Workspace:
    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        .first()
    )
    if not workspace:
        raise NotFoundError("Workspace not found")
    if workspace.owner_id != owner_id:
        raise ForbiddenError("Not allowed to access this workspace")
    return workspace

def update_workspace(
    db: Session, *, owner_id: uuid.UUID, workspace_id: uuid.UUID, name: str | None, spec: dict[str, Any] | None
) -> Workspace:
    workspace = get_workspace(db, owner_id=owner_id, workspace_id=workspace_id)
    if name is not None:
        workspace.name = name
    if spec is not None:
        workspace.spec = spec
    db.commit()
    db.refresh(workspace)
    return workspace

def delete_workspace(db: Session, *, owner_id: uuid.UUID, workspace_id: uuid.UUID) -> None:
    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        .first()
    )
    if not workspace:
        raise NotFoundError("Workspace not found")
    if workspace.owner_id != owner_id:
        raise ForbiddenError("Not allowed to delete this workspace")

    workspace.deleted_at = datetime.now(timezone.utc)
    db.commit()