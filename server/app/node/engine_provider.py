import uuid
from typing import Any, Iterator

from sqlalchemy.orm import Session
from tabular_manner.engine.bootstrap import Engine, build_engine

from app.node.repository import PostgresNodeLibraryRepository

class EngineError(Exception):
    pass

def consume(events: Iterator[dict[str, Any]]) -> dict[str, Any]:
    last: dict[str, Any] | None = None
    for event in events:
        last = event
        if event["event"] == "failed":
            raise EngineError(event.get("error", "engine operation failed"))
        if event["event"] == "completed":
            return event.get("data", {})
    raise EngineError(f"engine stream ended without completion: {last}")

class EngineProvider:
    def __init__(self):
        self._cache: dict[str, Engine] = {}

    def _build(self, workspace_id: uuid.UUID, db: Session) -> Engine:
        bucket = str(workspace_id)
        repository = PostgresNodeLibraryRepository(db)
        engine = build_engine(node_library_repository=repository, bucket=bucket)
        consume(engine.node_library.describe_nodes(bucket=bucket))
        return engine

    def get(self, workspace_id: uuid.UUID, db: Session) -> Engine:
        key = str(workspace_id)
        engine = self._cache.get(key)
        if engine is None:
            engine = self._build(workspace_id, db)
            self._cache[key] = engine
        return engine

    def build_fresh(self, workspace_id: uuid.UUID, db: Session) -> Engine:
        return self._build(workspace_id, db)

    def invalidate(self, workspace_id: uuid.UUID) -> None:
        self._cache.pop(str(workspace_id), None)

engine_provider = EngineProvider()
