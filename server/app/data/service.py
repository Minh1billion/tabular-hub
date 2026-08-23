import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.node.engine_provider import EngineError, consume, engine_provider

def import_resource(
    workspace_id: uuid.UUID,
    db: Session,
    *,
    key: str,
    source_kind: str,
    source_params: dict[str, Any],
    overwrite: bool,
) -> dict[str, Any]:
    engine = engine_provider.get(workspace_id, db)
    bucket = str(workspace_id)
    try:
        return consume(
            engine.data_resource.import_source(
                key=key,
                source_kind=source_kind,
                source_params=source_params,
                bucket=bucket,
                overwrite=overwrite,
            )
        )
    except EngineError as exc:
        raise AppError(str(exc)) from exc

def list_resources(workspace_id: uuid.UUID, db: Session) -> dict[str, Any]:
    engine = engine_provider.get(workspace_id, db)
    bucket = str(workspace_id)
    try:
        return consume(engine.data_resource.list(bucket=bucket))
    except EngineError as exc:
        raise AppError(str(exc)) from exc

def get_resource(workspace_id: uuid.UUID, db: Session, key: str, limit: int, offset: int) -> dict[str, Any]:
    engine = engine_provider.get(workspace_id, db)
    bucket = str(workspace_id)
    try:
        return consume(engine.data_resource.get(key, bucket=bucket, limit=limit, offset=offset))
    except EngineError as exc:
        raise AppError(str(exc)) from exc

def delete_resource(workspace_id: uuid.UUID, db: Session, key: str) -> None:
    engine = engine_provider.get(workspace_id, db)
    bucket = str(workspace_id)
    try:
        consume(engine.data_resource.delete(key, bucket=bucket))
    except EngineError as exc:
        raise AppError(str(exc)) from exc