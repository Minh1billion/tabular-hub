import uuid
from dataclasses import asdict

from sqlalchemy.orm import Session
from tabular_manner.engine.domain.models.custom_node import CustomNodeDefinition

from app.node.models import CustomNode

class PostgresNodeLibraryRepository:
    def __init__(self, db: Session):
        self._db = db

    def _workspace_id(self, bucket: str | None) -> uuid.UUID:
        if not bucket:
            raise ValueError("bucket must be a workspace id")
        return uuid.UUID(bucket)

    def _row(self, name: str, bucket: str | None) -> CustomNode:
        workspace_id = self._workspace_id(bucket)
        row = (
            self._db.query(CustomNode)
            .filter(CustomNode.workspace_id == workspace_id, CustomNode.name == name)
            .first()
        )
        if row is None:
            raise KeyError(f"No custom transform found under name '{name}'")
        return row

    @staticmethod
    def _to_definition(row: CustomNode) -> CustomNodeDefinition:
        return CustomNodeDefinition(**row.payload)

    def save(self, definition: CustomNodeDefinition, bucket: str | None = None) -> None:
        workspace_id = self._workspace_id(bucket)
        row = (
            self._db.query(CustomNode)
            .filter(CustomNode.workspace_id == workspace_id, CustomNode.name == definition.name)
            .first()
        )
        payload = asdict(definition)
        if row is None:
            row = CustomNode(
                workspace_id=workspace_id,
                name=definition.name,
                kind=definition.kind,
                description=definition.description,
                payload=payload,
            )
            self._db.add(row)
        else:
            row.kind = definition.kind
            row.description = definition.description
            row.payload = payload
        self._db.commit()

    def get(self, name: str, bucket: str | None = None) -> CustomNodeDefinition:
        return self._to_definition(self._row(name, bucket))

    def delete(self, name: str, bucket: str | None = None) -> None:
        row = self._row(name, bucket)
        self._db.delete(row)
        self._db.commit()

    def list(self, bucket: str | None = None) -> list[CustomNodeDefinition]:
        if not bucket:
            return []
        workspace_id = self._workspace_id(bucket)
        rows = (
            self._db.query(CustomNode)
            .filter(CustomNode.workspace_id == workspace_id)
            .order_by(CustomNode.name)
            .all()
        )
        return [self._to_definition(row) for row in rows]
