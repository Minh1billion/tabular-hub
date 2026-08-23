from tabular_manner.engine.domain.models.custom_node import CustomNodeDefinition
from tabular_manner.engine.domain.models.operator import Operator

from app.node.models import CustomNode
from app.node.schemas import CustomNodeRead, NodeParamSchema, NodeSchema

def describe_operator(operator_cls: type[Operator]) -> dict:
    node_type = operator_cls.registry_key or operator_cls.__name__.lower()
    return {
        "type": node_type,
        "label": operator_cls.label or node_type.replace("_", " ").title(),
        "category": operator_cls.category,
        "required": {k: Operator._type_name(v) for k, v in operator_cls.required.items()},
        "optional": {k: Operator._type_name(v[0]) for k, v in operator_cls.optional.items()},
        "ports_out": list(operator_cls.ports) if operator_cls.ports is not None else [operator_cls.default_port],
        "fan_in": operator_cls.fan_in,
        "in_ports": list(operator_cls.in_ports) if operator_cls.in_ports is not None else None,
    }

def build_node_schema(descriptor: dict, source: str, description: str = "") -> NodeSchema:
    node_type = descriptor["type"]
    label = descriptor["label"]
    category = descriptor["category"]
    params = [
        NodeParamSchema(name=name, type=type_name, required=True)
        for name, type_name in descriptor["required"].items()
    ] + [
        NodeParamSchema(name=name, type=type_name, required=False)
        for name, type_name in descriptor["optional"].items()
    ]
    return NodeSchema(
        type=node_type,
        label=label,
        category=category,
        description=description,
        source=source,
        params=params,
        ports_out=descriptor["ports_out"],
        in_ports=descriptor["in_ports"],
        fan_in=descriptor["fan_in"],
    )

def custom_node_row_to_read(row: CustomNode) -> CustomNodeRead:
    return CustomNodeRead(
        id=row.id,
        workspace_id=row.workspace_id,
        name=row.name,
        kind=row.kind,
        description=row.description,
        created_at=row.created_at,
    )

def definition_to_custom_metadata(definition: CustomNodeDefinition) -> dict:
    return {"name": definition.name, "kind": definition.kind, "description": definition.description}