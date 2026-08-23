from typing import Any

from pydantic import BaseModel, Field

class ImportResourceRequest(BaseModel):
    key: str = Field(min_length=1, max_length=200)
    source_kind: str
    source_params: dict[str, Any] = Field(default_factory=dict)
    overwrite: bool = False

class ImportResourceResponse(BaseModel):
    key: str
    columns: list[str]
    row_count: int

class ResourceListResponse(BaseModel):
    keys: list[str]

class ResourcePreviewResponse(BaseModel):
    key: str
    row_count: int
    returned_rows: int
    offset: int
    rows: list[dict[str, Any]]