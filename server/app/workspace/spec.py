from typing import Any

from app.core.exceptions import AppError

KIND_NODE = "node"
KIND_EDGE = "edge"

Element = tuple[str, str]

def edge_id(connection: dict[str, Any]) -> str:
    parts = (connection.get("from"), connection.get("to"), connection.get("on"), connection.get("into"))
    return ":".join(str(part) for part in parts if part)

def _index(spec: dict[str, Any] | None) -> tuple[dict[str, Any], dict[str, Any]]:
    if not spec:
        return {}, {}
    nodes = {node["id"]: node for node in spec.get("nodes") or []}
    edges = {edge_id(connection): connection for connection in spec.get("connections") or []}
    return nodes, edges

def validate_structure(spec: dict[str, Any]) -> None:
    nodes = spec.get("nodes", [])
    connections = spec.get("connections", [])
    if not isinstance(nodes, list) or not isinstance(connections, list):
        raise AppError("Spec nodes and connections must be lists")

    node_ids: set[str] = set()
    for node in nodes:
        node_id = node.get("id") if isinstance(node, dict) else None
        if not isinstance(node_id, str) or not node_id:
            raise AppError("Every node must have a string id")
        if node_id in node_ids:
            raise AppError(f"Duplicate node id '{node_id}'")
        node_ids.add(node_id)

    edge_ids: set[str] = set()
    for connection in connections:
        if not isinstance(connection, dict) or not connection.get("from") or not connection.get("to"):
            raise AppError("Every connection must have 'from' and 'to'")
        key = edge_id(connection)
        if key in edge_ids:
            raise AppError(f"Duplicate connection '{key}'")
        edge_ids.add(key)

def touched_elements(old: dict[str, Any] | None, new: dict[str, Any]) -> set[Element]:
    old_nodes, old_edges = _index(old)
    new_nodes, new_edges = _index(new)

    touched: set[Element] = set()
    for node_id, node in old_nodes.items():
        if node_id not in new_nodes or new_nodes[node_id] != node:
            touched.add((KIND_NODE, node_id))
    for key, connection in old_edges.items():
        if key not in new_edges or new_edges[key] != connection:
            touched.add((KIND_EDGE, key))
    return touched
