from fastapi import HTTPException

from tabular_manner.engine.bootstrap import Engine

from app.core.engine import drain_events
from app.nodes.policy import is_web_supported

def list_nodes(engine: Engine, bucket: str) -> dict:
    result = drain_events(engine.node_library.describe_nodes(bucket=bucket))
    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])

    registry = engine.registry_provider.get(bucket)
    data = result["data"]
    for group in ("builtin", "custom"):
        data[group] = [d for d in data[group] if is_web_supported(registry.get(d["type"]))]
        for descriptor in data[group]:
            descriptor["optional"].pop("bucket", None)
    return data

def register_node(engine: Engine, bucket: str, name: str, expression: str, description: str | None) -> dict:
    result = drain_events(engine.node_library.register_transform(name, expression, description, bucket=bucket))
    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]

def unregister_node(engine: Engine, bucket: str, name: str) -> None:
    result = drain_events(engine.node_library.unregister_node(name, bucket=bucket))
    if result["event"] == "failed":
        raise HTTPException(status_code=400, detail=result["error"])
