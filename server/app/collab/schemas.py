from typing import Literal

from pydantic import BaseModel, Field

LockKind = Literal["node", "edge"]

class LockTarget(BaseModel):
    kind: LockKind
    id: str = Field(min_length=1, max_length=400)

class LockRenew(BaseModel):
    items: list[LockTarget] | None = Field(default=None, max_length=200)

class PresenceUser(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
