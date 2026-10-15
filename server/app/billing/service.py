import uuid
from datetime import datetime, timezone

import stripe
from sqlalchemy.orm import Session

from app.billing.models import ProcessedWebhookEvent, Subscription
from app.billing.plans import PLAN_LIMITS, TIER_ORDER, tier_for_price
from app.config import settings
from app.core.exceptions import AppError

stripe.api_key = settings.STRIPE_SECRET_KEY

def get_or_create_subscription(db: Session, user_id: uuid.UUID) -> Subscription:
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if sub:
        return sub
    sub = Subscription(user_id=user_id, tier="free", status="active")
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

def get_plan_limits(db: Session, user_id: uuid.UUID) -> dict:
    sub = get_or_create_subscription(db, user_id)
    if sub.status not in ("active", "trialing"):
        return PLAN_LIMITS["free"]
    return PLAN_LIMITS.get(sub.tier, PLAN_LIMITS["free"])

def list_plans() -> list[dict]:
    plans = []
    for tier, limits in PLAN_LIMITS.items():
        price_id = limits["stripe_price_id"]
        if price_id is None:
            plans.append({
                "tier": tier,
                "label": tier.capitalize(),
                "price_cents": 0,
                "currency": "usd",
                "interval": None,
                "max_workspaces": limits["max_workspaces"],
                "max_resource_size_bytes": limits["max_resource_size_bytes"],
                "max_total_storage_bytes": limits["max_total_storage_bytes"],
            })
            continue

        price = stripe.Price.retrieve(price_id, expand=["product"])
        plans.append({
            "tier": tier,
            "label": price.product.name,
            "price_cents": price.unit_amount,
            "currency": price.currency,
            "interval": price.recurring.interval if price.recurring else None,
            "max_workspaces": limits["max_workspaces"],
            "max_resource_size_bytes": limits["max_resource_size_bytes"],
            "max_total_storage_bytes": limits["max_total_storage_bytes"],
        })
    return plans

def create_checkout_session(db: Session, user, tier: str) -> str:
    limits = PLAN_LIMITS.get(tier)
    if limits is None or limits["stripe_price_id"] is None:
        raise AppError(f"Unknown plan: {tier}")

    sub = get_or_create_subscription(db, user.id)
    if sub.status in ("active", "trialing") and TIER_ORDER.index(tier) <= TIER_ORDER.index(sub.tier):
        raise AppError(f"Already on {sub.tier}, which is equal to or higher than {tier}")

    if not sub.stripe_customer_id:
        customer = stripe.Customer.create(email=user.email, metadata={"user_id": str(user.id)})
        sub.stripe_customer_id = customer.id
        db.commit()

    session = stripe.checkout.Session.create(
        customer=sub.stripe_customer_id,
        mode="subscription",
        line_items=[{"price": limits["stripe_price_id"], "quantity": 1}],
        success_url=f"{settings.FRONTEND_URL}/billing?checkout=success",
        cancel_url=f"{settings.FRONTEND_URL}/billing?checkout=cancel",
        client_reference_id=str(user.id),
        metadata={"user_id": str(user.id), "tier": tier},
    )
    return session.url

def create_portal_session(db: Session, user) -> str:
    sub = get_or_create_subscription(db, user.id)
    if not sub.stripe_customer_id:
        raise AppError("No billing account found")

    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/billing",
    )
    return session.url

def handle_webhook_event(db: Session, payload: bytes, sig_header: str) -> None:
    event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)

    if db.query(ProcessedWebhookEvent).filter(ProcessedWebhookEvent.stripe_event_id == event["id"]).first():
        return

    data = event["data"]["object"]

    if event["type"] == "checkout.session.completed":
        sub = get_or_create_subscription(db, uuid.UUID(data["metadata"]["user_id"]))
        sub.stripe_subscription_id = data["subscription"]
        sub.tier = data["metadata"]["tier"]
        sub.status = "active"
        db.commit()

    elif event["type"] in ("customer.subscription.created", "customer.subscription.updated"):
        sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == data["id"]).first()
        if sub:
            price_id = data["items"]["data"][0]["price"]["id"]
            tier = tier_for_price(price_id)
            if tier:
                sub.tier = tier
            sub.status = data["status"]
            sub.cancel_at_period_end = data["cancel_at_period_end"]
            sub.current_period_end = datetime.fromtimestamp(data["current_period_end"], tz=timezone.utc)
            db.commit()

    elif event["type"] == "customer.subscription.deleted":
        sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == data["id"]).first()
        if sub:
            sub.tier = "free"
            sub.status = "canceled"
            sub.stripe_subscription_id = None
            db.commit()

    elif event["type"] == "invoice.payment_failed":
        sub = db.query(Subscription).filter(Subscription.stripe_customer_id == data["customer"]).first()
        if sub:
            sub.status = "past_due"
            db.commit()

    db.add(ProcessedWebhookEvent(stripe_event_id=event["id"]))
    db.commit()