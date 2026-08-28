UNSAFE_CONTEXT = {"reader_factory", "writer_factory"}
UNSAFE_REQUIRED_FIELDS = {"path", "dsn", "bucket"}

NODE_VISIBILITY_OVERRIDES: dict[str, bool] = {}

def is_web_supported(operator_cls) -> bool:
    override = NODE_VISIBILITY_OVERRIDES.get(operator_cls.registry_key)
    if override is not None:
        return override
    if operator_cls.category != "io":
        return True
    if UNSAFE_CONTEXT & set(operator_cls.context):
        return False
    if UNSAFE_REQUIRED_FIELDS & set(operator_cls.required):
        return False
    return True