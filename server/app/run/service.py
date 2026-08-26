import uuid
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.run.models import Run, RunEvent
from app.workspace.models import Workspace

def create_run(db: Session, *, workspace: Workspace, spec: dict[str, Any], idempotency_key: str) -> Run:
    run = Run(workspace_id=workspace.id, spec=spec, status="queued", idempotency_key=idempotency_key)
    db.add(run)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(Run)
            .filter(Run.workspace_id == workspace.id, Run.idempotency_key == idempotency_key)
            .first()
        )
        if existing is None:
            raise
        return existing
    db.refresh(run)
    return run

def list_runs(db: Session, *, workspace_id: uuid.UUID, limit: int = 20, offset: int = 0) -> list[Run]:
    return (
        db.query(Run)
        .filter(Run.workspace_id == workspace_id)
        .order_by(Run.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

def get_run(db: Session, *, workspace_id: uuid.UUID, run_id: uuid.UUID) -> Run | None:
    return db.query(Run).filter(Run.id == run_id, Run.workspace_id == workspace_id).first()

def list_run_events(db: Session, *, run_id: uuid.UUID) -> list[RunEvent]:
    return db.query(RunEvent).filter(RunEvent.run_id == run_id).order_by(RunEvent.attempt, RunEvent.seq).all()