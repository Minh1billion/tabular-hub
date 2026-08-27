import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session
from tabular_manner.engine.bootstrap import Engine

from app.core.exceptions import AppError, ForbiddenError, NotFoundError
from app.workspace.models import Workspace

def _drain(events) -> dict:
    result = None
    for event in events:
        result = event
    return result

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

def delete_workspace(db: Session, *, owner_id: uuid.UUID, workspace_id: uuid.UUID, engine: Engine) -> None:
    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        .first()
    )
    if not workspace:
        raise NotFoundError("Workspace not found")
    if workspace.owner_id != owner_id:
        raise ForbiddenError("Not allowed to delete this workspace")

    bucket = str(workspace.id)

    resources = _drain(engine.data_resource.list(bucket=bucket))
    if resources["event"] == "failed":
        raise AppError(f"Failed to list resources for workspace: {resources['error']}")
    for key in resources["data"]["keys"]:
        result = _drain(engine.data_resource.delete(key, bucket=bucket))
        if result["event"] == "failed":
            raise AppError(f"Failed to delete resource '{key}': {result['error']}")

    nodes = _drain(engine.node_library.list_nodes(bucket=bucket))
    if nodes["event"] == "failed":
        raise AppError(f"Failed to list custom nodes for workspace: {nodes['error']}")
    for definition in nodes["data"]["custom"]:
        result = _drain(engine.node_library.unregister_node(definition["name"], bucket=bucket))
        if result["event"] == "failed":
            raise AppError(f"Failed to remove custom node '{definition['name']}': {result['error']}")

    workspace.deleted_at = datetime.now(timezone.utc)
    db.commit()