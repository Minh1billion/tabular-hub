from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.shared.models import GUID, TimestampMixin, UUIDPKMixin

class Subscription(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False, unique=True)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    tier = Column(String, nullable=False, default="free")
    status = Column(String, nullable=False, default="active")
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)

    user = relationship("User", back_populates="subscription")

class ProcessedWebhookEvent(Base, UUIDPKMixin):
    __tablename__ = "processed_webhook_events"

    stripe_event_id = Column(String, nullable=False, unique=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
