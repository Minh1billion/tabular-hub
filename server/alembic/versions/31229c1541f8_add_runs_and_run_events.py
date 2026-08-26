"""add runs and run_events

Revision ID: 31229c1541f8
Revises: 1ca620a2d756
Create Date: 2026-08-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import app.shared.models


revision = '31229c1541f8'
down_revision = '1ca620a2d756'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('runs',
    sa.Column('workspace_id', app.shared.models.GUID(), nullable=False),
    sa.Column('spec', sa.JSON(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('execution_id', sa.String(), nullable=True),
    sa.Column('idempotency_key', sa.String(), nullable=False),
    sa.Column('attempt', sa.Integer(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', app.shared.models.GUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('workspace_id', 'idempotency_key', name='uq_run_workspace_idempotency_key')
    )
    op.create_table('run_events',
    sa.Column('run_id', app.shared.models.GUID(), nullable=False),
    sa.Column('attempt', sa.Integer(), nullable=False),
    sa.Column('seq', sa.Integer(), nullable=False),
    sa.Column('event', sa.String(), nullable=False),
    sa.Column('data', sa.JSON(), nullable=True),
    sa.Column('ts', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', app.shared.models.GUID(), nullable=False),
    sa.ForeignKeyConstraint(['run_id'], ['runs.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('run_id', 'attempt', 'seq', name='uq_run_event_run_attempt_seq')
    )


def downgrade() -> None:
    op.drop_table('run_events')
    op.drop_table('runs')