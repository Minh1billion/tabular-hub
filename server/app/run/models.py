from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.shared.models import GUID, TimestampMixin, UUIDPKMixin

class Run(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "runs"
    __table_args__ = (
        UniqueConstraint("workspace_id", "idempotency_key", name="uq_run_workspace_idempotency_key"),
    )

    workspace_id = Column(GUID(), ForeignKey("workspaces.id"), nullable=False)
    kind = Column(String, nullable=False, default="pipeline")
    spec = Column(JSON, nullable=False)
    status = Column(String, nullable=False, default="queued")
    execution_id = Column(String, nullable=True)
    idempotency_key = Column(String, nullable=False)
    attempt = Column(Integer, nullable=False, default=1)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    workspace = relationship("Workspace")
    events = relationship("RunEvent", back_populates="run", order_by="RunEvent.seq")

class RunEvent(Base, UUIDPKMixin):
    __tablename__ = "run_events"
    __table_args__ = (
        UniqueConstraint("run_id", "attempt", "seq", name="uq_run_event_run_attempt_seq"),
    )

    run_id = Column(GUID(), ForeignKey("runs.id"), nullable=False)
    attempt = Column(Integer, nullable=False)
    seq = Column(Integer, nullable=False)
    event = Column(String, nullable=False)
    data = Column(JSON, nullable=True)
    ts = Column(DateTime(timezone=True), nullable=False)

    run = relationship("Run", back_populates="events")