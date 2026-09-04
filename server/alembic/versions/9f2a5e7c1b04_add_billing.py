"""add billing

Revision ID: 9f2a5e7c1b04
Revises: 7b1e4a9f2c3d
Create Date: 2026-09-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import app.shared.models


revision = '9f2a5e7c1b04'
down_revision = '7b1e4a9f2c3d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('subscriptions',
    sa.Column('user_id', app.shared.models.GUID(), nullable=False),
    sa.Column('stripe_customer_id', sa.String(), nullable=True),
    sa.Column('stripe_subscription_id', sa.String(), nullable=True),
    sa.Column('tier', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
    sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False),
    sa.Column('id', app.shared.models.GUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_table('processed_webhook_events',
    sa.Column('stripe_event_id', sa.String(), nullable=False),
    sa.Column('id', app.shared.models.GUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('stripe_event_id')
    )
    op.create_table('resource_usage',
    sa.Column('workspace_id', app.shared.models.GUID(), nullable=False),
    sa.Column('key', sa.String(), nullable=False),
    sa.Column('size_bytes', sa.Integer(), nullable=False),
    sa.Column('id', app.shared.models.GUID(), nullable=False),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('workspace_id', 'key', name='uq_resource_usage_workspace_key')
    )


def downgrade() -> None:
    op.drop_table('resource_usage')
    op.drop_table('processed_webhook_events')
    op.drop_table('subscriptions')
