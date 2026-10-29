import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session
from tabular_manner.engine.bootstrap import Engine

from app.billing import service as billing_service
from app.core.engine import drain_events
from app.core.exceptions import AppError, ForbiddenError, NotFoundError, PlanLimitExceededError
from app.resources.models import ResourceUsage
from app.run.models import Run
from app.workspace.models import Workspace
from app.workspace.schemas import WorkspaceLastRun, WorkspaceListItem

def create_workspace(db: Session, *, owner_id: uuid.UUID, name: str) -> Workspace:
    limits = billing_service.get_plan_limits(db, owner_id)
    workspace_count = (
        db.query(Workspace)
        .filter(Workspace.owner_id == owner_id, Workspace.deleted_at.is_(None))
        .count()
    )
    if workspace_count >= limits["max_workspaces"]:
        raise PlanLimitExceededError(f"Workspace limit reached ({limits['max_workspaces']})")

    workspace = Workspace(name=name, owner_id=owner_id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace

def list_workspaces(db: Session, *, owner_id: uuid.UUID) -> list[WorkspaceListItem]:
    workspaces = (
        db.query(Workspace)
        .filter(Workspace.owner_id == owner_id, Workspace.deleted_at.is_(None))
        .order_by(Workspace.updated_at.desc(), Workspace.created_at.desc())
        .all()
    )
    if not workspaces:
        return []

    workspace_ids = [workspace.id for workspace in workspaces]

    dataset_counts = dict(
        db.query(ResourceUsage.workspace_id, func.count(ResourceUsage.id))
        .filter(ResourceUsage.workspace_id.in_(workspace_ids))
        .group_by(ResourceUsage.workspace_id)
        .all()
    )

    # Latest pipeline run per workspace (import/export runs are dataset operations, not pipeline activity).
    latest_run_at = (
        db.query(Run.workspace_id.label("workspace_id"), func.max(Run.created_at).label("created_at"))
        .filter(Run.workspace_id.in_(workspace_ids), Run.kind == "pipeline")
        .group_by(Run.workspace_id)
        .subquery()
    )
    last_runs: dict[uuid.UUID, Run] = {}
    for run in (
        db.query(Run)
        .join(
            latest_run_at,
            (Run.workspace_id == latest_run_at.c.workspace_id) & (Run.created_at == latest_run_at.c.created_at),
        )
        .filter(Run.kind == "pipeline")
        .all()
    ):
        last_runs.setdefault(run.workspace_id, run)

    return [
        WorkspaceListItem.model_validate(workspace).model_copy(
            update={
                "dataset_count": dataset_counts.get(workspace.id, 0),
                "last_run": WorkspaceLastRun.model_validate(last_runs[workspace.id]) if workspace.id in last_runs else None,
            }
        )
        for workspace in workspaces
    ]

def get_workspace(
    db: Session, *, owner_id: uuid.UUID, workspace_id: uuid.UUID, touch: bool = False
) -> Workspace:
    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        .first()
    )
    if not workspace:
        raise NotFoundError("Workspace not found")
    if workspace.owner_id != owner_id:
        raise ForbiddenError("Not allowed to access this workspace")
    if touch:
        workspace.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(workspace)
    return workspace

def update_workspace(
    db: Session, *, owner_id: uuid.UUID, workspace_id: uuid.UUID, name: str | None, spec: dict[str, Any] | None
) -> Workspace:
    workspace = get_workspace(db, owner_id=owner_id, workspace_id=workspace_id)
    if name is not None:
        workspace.name = name
    if spec is not None:
        workspace.spec = spec
    workspace.updated_at = datetime.now(timezone.utc)
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

    resources = drain_events(engine.data_resource.list(bucket=bucket))
    if resources["event"] == "failed":
        raise AppError(f"Failed to list resources for workspace: {resources['error']}")
    for key in resources["data"]["keys"]:
        result = drain_events(engine.data_resource.delete(key, bucket=bucket))
        if result["event"] == "failed":
            raise AppError(f"Failed to delete resource '{key}': {result['error']}")

    nodes = drain_events(engine.node_library.list_nodes(bucket=bucket))
    if nodes["event"] == "failed":
        raise AppError(f"Failed to list custom nodes for workspace: {nodes['error']}")
    for definition in nodes["data"]["custom"]:
        result = drain_events(engine.node_library.unregister_node(definition["name"], bucket=bucket))
        if result["event"] == "failed":
            raise AppError(f"Failed to remove custom node '{definition['name']}': {result['error']}")

    db.query(ResourceUsage).filter(ResourceUsage.workspace_id == workspace.id).delete()
    workspace.deleted_at = datetime.now(timezone.utc)
    db.commit()