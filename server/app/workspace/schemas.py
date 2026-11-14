import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)

class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    spec: dict[str, Any] | None = None

class WorkspaceOwner(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    display_name: str | None

class WorkspaceRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    role: str = "owner"
    spec: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

class WorkspaceLastRun(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    kind: str
    status: str
    created_at: datetime

class WorkspaceListItem(WorkspaceRead):
    dataset_count: int = 0
    last_run: WorkspaceLastRun | None = None
    owner: WorkspaceOwner | None = None

class MemberInvite(BaseModel):
    email: str = Field(min_length=3, max_length=254)

class MemberRead(BaseModel):
    user_id: uuid.UUID
    email: str
    display_name: str | None
    avatar_url: str | None
    role: str
    joined_at: datetime | None = None

class InvitationRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    status: str
    expires_at: datetime
    created_at: datetime

class WorkspaceMembersRead(BaseModel):
    owner: MemberRead
    members: list[MemberRead]
    invitations: list[InvitationRead]

class InviteResult(BaseModel):
    member: MemberRead | None = None
    invitation: InvitationRead | None = None
    email_sent: bool
    invite_url: str