from sqlalchemy import JSON, Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.shared.models import GUID, TimestampMixin, UUIDPKMixin

class CustomNode(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "custom_nodes"
    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_custom_node_workspace_name"),
    )

    workspace_id = Column(GUID(), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String, nullable=False)
    kind = Column(String, nullable=False)
    description = Column(String, nullable=False, default="")
    payload = Column(JSON, nullable=False)

    workspace = relationship("Workspace")
