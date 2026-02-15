"""Sync parcel fields and media columns

Revision ID: e4_sync_parcel_and_media
Revises: d3_add_amount_paid
Create Date: 2026-02-13 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e4_sync_parcel_and_media'
down_revision = 'd3_add_amount_paid'
branch_labels = None
depends_on = None


def upgrade():
    # Add GIS coordinates string (replace x/y semantics)
    op.add_column('properties', sa.Column('gis_coordinates', sa.String(), nullable=True))
    # Add media link column
    op.add_column('properties', sa.Column('video_link', sa.String(), nullable=True))
    # Add new_owner_id for transfers
    op.add_column('properties', sa.Column('new_owner_id', sa.Integer(), nullable=True))
    # Ensure parcel JSON columns exist (no-op if already present in earlier revisions)
    try:
        op.add_column('properties', sa.Column('parcel_raw', postgresql.JSONB(), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('properties', sa.Column('parcel_location', postgresql.JSONB(), nullable=True))
    except Exception:
        pass

    # Remove legacy x/y coordinate columns if present
    with op.batch_alter_table('properties') as batch_op:
        try:
            batch_op.drop_column('x_coordinate')
        except Exception:
            pass
        try:
            batch_op.drop_column('y_coordinate')
        except Exception:
            pass


def downgrade():
    # Re-create legacy x/y columns
    with op.batch_alter_table('properties') as batch_op:
        batch_op.add_column(sa.Column('y_coordinate', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('x_coordinate', sa.String(), nullable=True))

    # Drop added columns
    op.drop_column('properties', 'new_owner_id')
    op.drop_column('properties', 'video_link')
    op.drop_column('properties', 'gis_coordinates')
    try:
        op.drop_column('properties', 'parcel_location')
    except Exception:
        pass
    try:
        op.drop_column('properties', 'parcel_raw')
    except Exception:
        pass
