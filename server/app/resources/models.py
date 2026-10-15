from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint

from app.database import Base
from app.shared.models import GUID, UUIDPKMixin

class ResourceUsage(Base, UUIDPKMixin):
    __tablename__ = "resource_usage"
    __table_args__ = (
        UniqueConstraint("workspace_id", "key", name="uq_resource_usage_workspace_key"),
    )

    workspace_id = Column(GUID(), ForeignKey("workspaces.id"), nullable=False)
    key = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
