"""add run started_at and heartbeat_at

Revision ID: c4e8b2a71d05
Revises: d9dd28749a14
Create Date: 2026-10-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c4e8b2a71d05'
down_revision = 'd9dd28749a14'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('runs', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('runs', sa.Column('heartbeat_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_runs_status_heartbeat_at', 'runs', ['status', 'heartbeat_at'])


def downgrade() -> None:
    op.drop_index('ix_runs_status_heartbeat_at', table_name='runs')
    op.drop_column('runs', 'heartbeat_at')
    op.drop_column('runs', 'started_at')
