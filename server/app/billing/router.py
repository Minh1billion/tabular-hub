from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.auth.models import User
from app.billing import service
from app.billing.schemas import CheckoutRequest, CheckoutResponse, PlanRead, PortalResponse, SubscriptionRead
from app.core.exceptions import AppError
from app.database import get_db
from app.dependencies import get_accessible_workspace, get_current_user
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
    return service.get_subscription_overview(db, current_user.id)

@router.get("/workspaces/{workspace_id}/subscription", response_model=SubscriptionRead)
def workspace_subscription(
    workspace: Workspace = Depends(get_accessible_workspace),
    db: Session = Depends(get_db),
):
    return service.get_subscription_overview(db, workspace.owner_id)

@router.post("/webhook/stripe", status_code=status.HTTP_204_NO_CONTENT)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        service.handle_webhook_event(db, payload, sig_header)
    except Exception as exc:
        raise AppError(f"Webhook error: {exc}")