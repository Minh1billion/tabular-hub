from pydantic import BaseModel, Field

class NodeDescriptor(BaseModel):
    type: str
    required: dict[str, str]
    optional: dict[str, str]
    ports_out: list[str]
    fan_in: bool
    in_ports: list[str] | None

class NodeLibraryOut(BaseModel):
    builtin: list[NodeDescriptor]
    custom: list[NodeDescriptor]

class RegisterNodeRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    expression: str = Field(min_length=1)
    description: str = ""