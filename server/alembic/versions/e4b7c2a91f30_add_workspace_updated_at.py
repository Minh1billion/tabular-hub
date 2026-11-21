"""add workspace updated_at

Revision ID: e4b7c2a91f30
Revises: d9dd28749a14
Create Date: 2026-10-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'e4b7c2a91f30'
down_revision = 'd9dd28749a14'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('workspaces', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.execute('UPDATE workspaces SET updated_at = created_at')
    with op.batch_alter_table('workspaces') as batch_op:
        batch_op.alter_column('updated_at', nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('workspaces') as batch_op:
        batch_op.drop_column('updated_at')

