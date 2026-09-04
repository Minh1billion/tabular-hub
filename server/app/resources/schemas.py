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

class PresignUploadRequest(BaseModel):
    filename: str = Field(min_length=1)
    key: str = Field(min_length=1)
    format: str = "csv"
    overwrite: bool = False
    idempotency_key: str = Field(min_length=1, max_length=200)

class PresignUploadResponse(BaseModel):
    run_id: str
    upload_url: str
    staging_key: str

class ExportDownloadResponse(BaseModel):
    download_url: str