"""add run kind

Revision ID: 7b1e4a9f2c3d
Revises: 2e78d97e15ec
Create Date: 2026-08-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '7b1e4a9f2c3d'
down_revision = '2e78d97e15ec'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('runs', sa.Column('kind', sa.String(), nullable=False, server_default='pipeline'))


def downgrade() -> None:
    op.drop_column('runs', 'kind')
