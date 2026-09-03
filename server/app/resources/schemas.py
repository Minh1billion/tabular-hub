from typing import Any

from pydantic import BaseModel, Field

class ResourceListResponse(BaseModel):
    keys: list[str]

class ResourcePreviewResponse(BaseModel):
    key: str
    bucket: str | None
    row_count: int
    returned_rows: int
    offset: int
    rows: list[dict[str, Any]]

class ExportResourceCreate(BaseModel):
    format: str = "csv"
    idempotency_key: str = Field(min_length=1, max_length=200)