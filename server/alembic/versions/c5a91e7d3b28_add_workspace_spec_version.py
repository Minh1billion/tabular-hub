"""add workspace spec_version

Revision ID: c5a91e7d3b28
Revises: b2c8d4e1a7f5
Create Date: 2026-11-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c5a91e7d3b28'
down_revision = 'b2c8d4e1a7f5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('workspaces', sa.Column('spec_version', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('workspaces') as batch_op:
        batch_op.drop_column('spec_version')
