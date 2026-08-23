import uuid
from typing import Any, AsyncIterator

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.node.engine_provider import EngineError, consume, engine_provider
from app.node.mappers import build_node_schema, custom_node_row_to_read, describe_operator
from app.node.models import CustomNode
from app.node.schemas import (
    CustomNodeRead,
    ExecuteGraphRequest,
    NodeCatalogResponse,
    RegisterTransformNodeRequest,
    ValidateGraphRequest,
    ValidateGraphResponse,
)

def get_catalog(workspace_id: uuid.UUID, db: Session) -> NodeCatalogResponse:
    engine = engine_provider.get(workspace_id, db)
    registry = engine.registry

    custom_rows = {
        row.name: row
        for row in db.query(CustomNode).filter(CustomNode.workspace_id == workspace_id).all()
    }

    builtin_schemas = [
        build_node_schema(describe_operator(registry.get(key)), source="builtin")
        for key in sorted(registry.keys())
        if registry.is_builtin(key)
    ]
    custom_schemas = [
        build_node_schema(
            describe_operator(registry.get(key)),
            source="custom",
            description=custom_rows[key].description if key in custom_rows else "",
        )
        for key in sorted(registry.keys())
        if not registry.is_builtin(key)
    ]

    return NodeCatalogResponse(builtin=builtin_schemas, custom=custom_schemas)

def register_transform(
    workspace_id: uuid.UUID, db: Session, payload: RegisterTransformNodeRequest
) -> CustomNodeRead:
    engine = engine_provider.build_fresh(workspace_id, db)
    bucket = str(workspace_id)
    try:
        consume(
            engine.node_library.register_transform(
                name=payload.name,
                expression=payload.expression,
                description=payload.description,
                bucket=bucket,
            )
        )
    except EngineError as exc:
        raise AppError(str(exc)) from exc
    engine_provider.invalidate(workspace_id)

    row = (
        db.query(CustomNode)
        .filter(CustomNode.workspace_id == workspace_id, CustomNode.name == payload.name)
        .first()
    )
    return custom_node_row_to_read(row)

def unregister_custom_node(workspace_id: uuid.UUID, db: Session, name: str) -> None:
    engine = engine_provider.build_fresh(workspace_id, db)
    bucket = str(workspace_id)
    try:
        consume(engine.node_library.unregister_node(name, bucket=bucket))
    except EngineError as exc:
        raise AppError(str(exc)) from exc
    engine_provider.invalidate(workspace_id)

def get_custom_node(workspace_id: uuid.UUID, db: Session, name: str) -> CustomNodeRead:
    row = (
        db.query(CustomNode)
        .filter(CustomNode.workspace_id == workspace_id, CustomNode.name == name)
        .first()
    )
    if row is None:
        raise AppError(f"No custom node found under name '{name}'")
    return custom_node_row_to_read(row)

def validate_graph(
    workspace_id: uuid.UUID, db: Session, payload: ValidateGraphRequest
) -> ValidateGraphResponse:
    engine = engine_provider.get(workspace_id, db)
    spec = payload.spec.model_dump()
    try:
        consume(engine.execution.validate(spec))
    except EngineError as exc:
        return ValidateGraphResponse(valid=False, error=str(exc))
    return ValidateGraphResponse(valid=True)

async def execute_graph(
    workspace_id: uuid.UUID, db: Session, payload: ExecuteGraphRequest
) -> AsyncIterator[dict[str, Any]]:
    engine = engine_provider.get(workspace_id, db)
    spec = payload.spec.model_dump()
    for event in engine.execution.execute(spec=spec):
        yield event
        if event["event"] in ("completed", "failed"):
            break
