from typing import Any

from pydantic import BaseModel

class ResourceListResponse(BaseModel):
    keys: list[str]

class ResourcePreviewResponse(BaseModel):
    key: str
    bucket: str | None
    row_count: int
    returned_rows: int
    offset: int
    rows: list[dict[str, Any]]