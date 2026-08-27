"""add run cancelled_at

Revision ID: 2e78d97e15ec
Revises: 31229c1541f8
Create Date: 2026-08-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '2e78d97e15ec'
down_revision = '31229c1541f8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('runs', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('runs', 'cancelled_at')