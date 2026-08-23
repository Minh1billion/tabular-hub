import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)

class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    spec: dict[str, Any] | None = None

class WorkspaceRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    spec: dict[str, Any] | None
    created_at: datetime