from app.core.exceptions import AppError
from app.nodes.policy import is_web_supported

def strip_bucket_params(spec: dict) -> dict:
    nodes = []
    for n in spec.get("nodes", []):
        params = n.get("params", {})
        if "bucket" in params:
            n = {**n, "params": {k: v for k, v in params.items() if k != "bucket"}}
        nodes.append(n)
    return {**spec, "nodes": nodes}

def assert_web_supported_nodes(spec: dict, registry) -> None:
    for n in spec.get("nodes", []):
        try:
            operator_cls = registry.get(n["type"])
        except KeyError:
            continue
        if not is_web_supported(operator_cls):
            raise AppError(f"Node type '{n['type']}' is not supported in the web app")