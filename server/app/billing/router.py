from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.models import User
from app.billing import service
from app.billing.plans import PLAN_LIMITS
from app.billing.schemas import CheckoutRequest, CheckoutResponse, PlanRead, PortalResponse, SubscriptionRead
from app.core.exceptions import AppError
from app.database import get_db
from app.dependencies import get_current_user
from app.resources.models import ResourceUsage
from app.workspace.models import Workspace

router = APIRouter(prefix="/billing", tags=["billing"])

@router.get("/plans", response_model=list[PlanRead])
def plans():
    return service.list_plans()

@router.post("/checkout-session", response_model=CheckoutResponse)
def checkout_session(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = service.create_checkout_session(db, current_user, payload.tier)
    return CheckoutResponse(url=url)

@router.post("/portal-session", response_model=PortalResponse)
def portal_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = service.create_portal_session(db, current_user)
    return PortalResponse(url=url)

@router.get("/subscription", response_model=SubscriptionRead)
def subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = service.get_or_create_subscription(db, current_user.id)
    limits = PLAN_LIMITS.get(sub.tier, PLAN_LIMITS["free"])

    workspace_count = (
        db.query(Workspace)
        .filter(Workspace.owner_id == current_user.id, Workspace.deleted_at.is_(None))
        .count()
    )
    storage_used_bytes = (
        db.query(func.coalesce(func.sum(ResourceUsage.size_bytes), 0))
        .join(Workspace, Workspace.id == ResourceUsage.workspace_id)
        .filter(Workspace.owner_id == current_user.id)
        .scalar()
    )

    return SubscriptionRead(
        tier=sub.tier,
        status=sub.status,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        max_workspaces=limits["max_workspaces"],
        workspace_count=workspace_count,
        max_resource_size_bytes=limits["max_resource_size_bytes"],
        max_total_storage_bytes=limits["max_total_storage_bytes"],
        storage_used_bytes=storage_used_bytes,
    )

@router.post("/webhook/stripe", status_code=status.HTTP_204_NO_CONTENT)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        service.handle_webhook_event(db, payload, sig_header)
    except Exception as exc:
        raise AppError(f"Webhook error: {exc}")