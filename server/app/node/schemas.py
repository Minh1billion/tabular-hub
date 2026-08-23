import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

class NodeParamSchema(BaseModel):
    name: str
    type: str
    required: bool

class NodeSchema(BaseModel):
    type: str
    label: str
    category: str
    description: str
    source: Literal["builtin", "custom"]
    params: list[NodeParamSchema]
    ports_out: list[str]
    in_ports: list[str] | None
    fan_in: bool

class NodeCatalogResponse(BaseModel):
    builtin: list[NodeSchema]
    custom: list[NodeSchema]

class RegisterTransformNodeRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    expression: str = Field(min_length=1)
    description: str = ""

class CustomNodeRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    kind: str
    description: str
    created_at: datetime

class GraphSpec(BaseModel):
    name: str
    nodes: list[dict[str, Any]]
    connections: list[dict[str, Any]]

class ValidateGraphRequest(BaseModel):
    spec: GraphSpec

class ValidateGraphResponse(BaseModel):
    valid: bool
    error: str | None = None

class ExecuteGraphRequest(BaseModel):
    spec: GraphSpec
