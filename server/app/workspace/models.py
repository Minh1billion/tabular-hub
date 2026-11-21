from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.shared.models import GUID, TimestampMixin, UUIDPKMixin

ROLE_OWNER = "owner"
ROLE_MEMBER = "member"

INVITATION_PENDING = "pending"
INVITATION_ACCEPTED = "accepted"
INVITATION_EXPIRED = "expired"

class Workspace(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "workspaces"

    name = Column(String, nullable=False)
    owner_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    spec = Column(JSON, nullable=True)
    spec_version = Column(Integer, nullable=False, default=0, server_default="0")
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner = relationship("User", back_populates="workspaces")

class WorkspaceMember(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "workspace_members"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

    workspace_id = Column(GUID(), ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False, default=ROLE_MEMBER)
    invited_by = Column(GUID(), ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id])

class WorkspaceInvitation(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "workspace_invitations"
    __table_args__ = (
        UniqueConstraint("workspace_id", "email", name="uq_workspace_invitation_email"),
    )

    workspace_id = Column(GUID(), ForeignKey("workspaces.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default=INVITATION_PENDING)
    invited_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
