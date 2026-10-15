from app.config import settings

TIER_ORDER = ["free", "pro", "team"]

PLAN_LIMITS = {
    "free": {
        "stripe_price_id": None,
        "max_workspaces": 1,
        "max_resource_size_bytes": 50 * 1024 * 1024,
        "max_total_storage_bytes": 500 * 1024 * 1024,
    },
    "pro": {
        "stripe_price_id": settings.STRIPE_PRICE_ID_PRO,
        "max_workspaces": 10,
        "max_resource_size_bytes": 500 * 1024 * 1024,
        "max_total_storage_bytes": 20 * 1024 * 1024 * 1024,
    },
    "team": {
        "stripe_price_id": settings.STRIPE_PRICE_ID_TEAM,
        "max_workspaces": 50,
        "max_resource_size_bytes": 2 * 1024 * 1024 * 1024,
        "max_total_storage_bytes": 200 * 1024 * 1024 * 1024,
    },
}

def tier_for_price(price_id: str) -> str | None:
    for tier, limits in PLAN_LIMITS.items():
        if limits["stripe_price_id"] == price_id:
            return tier
    return None