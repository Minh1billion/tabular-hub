"""add workspace spec

Revision ID: 1ca620a2d756
Revises: a3d1f6c9e210
Create Date: 2026-08-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '1ca620a2d756'
down_revision = 'a3d1f6c9e210'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('workspaces', sa.Column('spec', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('workspaces', 'spec')