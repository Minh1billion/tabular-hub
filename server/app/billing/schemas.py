from datetime import datetime

from pydantic import BaseModel

class CheckoutRequest(BaseModel):
    tier: str

class CheckoutResponse(BaseModel):
    url: str

class PortalResponse(BaseModel):
    url: str

class PlanRead(BaseModel):
    tier: str
    label: str
    price_cents: int
    currency: str
    interval: str | None
    max_workspaces: int
    max_resource_size_bytes: int
    max_total_storage_bytes: int

class SubscriptionRead(BaseModel):
    tier: str
    status: str
    current_period_end: datetime | None
    cancel_at_period_end: bool
    max_workspaces: int
    workspace_count: int
    max_resource_size_bytes: int
    max_total_storage_bytes: int
    storage_used_bytes: int