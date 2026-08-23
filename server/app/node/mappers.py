from tabular_manner.engine.domain.models.custom_node import CustomNodeDefinition
from tabular_manner.engine.domain.models.operator import Operator

from app.node.models import CustomNode
from app.node.schemas import CustomNodeRead, NodeParamSchema, NodeSchema

def describe_operator(operator_cls: type[Operator]) -> dict:
    return {
        "type": operator_cls.registry_key or operator_cls.__name__.lower(),
        "required": {k: Operator._type_name(v) for k, v in operator_cls.required.items()},
        "optional": {k: Operator._type_name(v[0]) for k, v in operator_cls.optional.items()},
        "ports_out": list(operator_cls.ports) if operator_cls.ports is not None else [operator_cls.default_port],
        "fan_in": operator_cls.fan_in,
        "in_ports": list(operator_cls.in_ports) if operator_cls.in_ports is not None else None,
    }

_BUILTIN_METADATA: dict[str, tuple[str, str]] = {
    "select": ("Select Columns", "transform"),
    "drop": ("Drop Columns", "transform"),
    "limit": ("Limit Rows", "transform"),
    "head": ("Head Rows", "transform"),
    "tail": ("Tail Rows", "transform"),
    "explode": ("Explode Columns", "transform"),
    "group_by": ("Group By", "transform"),
    "log": ("Log Transform", "transform"),
    "zscore_normalize": ("Z-Score Normalize", "transform"),
    "minmax_normalize": ("Min-Max Normalize", "transform"),
    "fill_mean": ("Fill Missing (Mean)", "transform"),
    "fill_null": ("Fill Missing (Value)", "transform"),
    "drop_nulls": ("Drop Null Rows", "transform"),
    "drop_duplicates": ("Drop Duplicate Rows", "transform"),
    "rename": ("Rename Columns", "transform"),
    "sort": ("Sort Rows", "transform"),
    "cast": ("Cast Column Type", "transform"),
    "filter": ("Filter Rows", "transform"),
    "derive": ("Derive Column", "transform"),
    "fetch_internal": ("Fetch (Internal)", "io"),
    "fetch_csv": ("Fetch CSV", "io"),
    "fetch_parquet": ("Fetch Parquet", "io"),
    "fetch_arrow": ("Fetch Arrow", "io"),
    "fetch_s3": ("Fetch S3", "io"),
    "fetch_postgres": ("Fetch Postgres", "io"),
    "push_internal": ("Export (Internal)", "io"),
    "push_csv": ("Export CSV", "io"),
    "push_parquet": ("Export Parquet", "io"),
    "push_arrow": ("Export Arrow", "io"),
    "push_postgres": ("Export Postgres", "io"),
    "union": ("Union", "merge"),
    "join": ("Join", "merge"),
    "switch": ("Switch", "control"),
    "if": ("If", "control"),
}

def build_node_schema(descriptor: dict, source: str, description: str = "") -> NodeSchema:
    node_type = descriptor["type"]
    label, category = _BUILTIN_METADATA.get(node_type, (node_type.replace("_", " ").title(), "custom"))
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