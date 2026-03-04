"""add pdf_context to chat_sessions

Revision ID: f5_chat_pdf_context
Revises: e4_sync_parcel_and_media
Create Date: 2026-03-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'f5_chat_pdf_context'
down_revision = 'e4_sync_parcel_and_media'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'chat_sessions',
        sa.Column('pdf_context', JSONB, nullable=True)
    )


def downgrade():
    op.drop_column('chat_sessions', 'pdf_context')
