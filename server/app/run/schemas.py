import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

class RunCreate(BaseModel):
    spec: dict[str, Any]
    idempotency_key: str = Field(min_length=1, max_length=200)

class RunRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    workspace_id: uuid.UUID
    kind: str
    status: str
    execution_id: str | None
    attempt: int
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime

class RunEventRead(BaseModel):
    model_config = {"from_attributes": True}

    attempt: int
    seq: int
    event: str
    data: dict[str, Any] | None
    ts: datetime

class ValidateRequest(BaseModel):
    spec: dict[str, Any]

class ValidateResponse(BaseModel):
    valid: bool
    error: str | None = None