from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.shared.models import GUID, TimestampMixin, UUIDPKMixin

class Workspace(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "workspaces"

    name = Column(String, nullable=False)
    owner_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    spec = Column(JSON, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner = relationship("User", back_populates="workspaces")