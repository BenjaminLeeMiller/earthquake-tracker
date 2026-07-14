"""Initial schema: the earthquakes table.

Baseline for databases created before Alembic was adopted — those are
detected at startup (earthquakes table exists but alembic_version doesn't)
and stamped with this revision instead of re-running it. See
app/migrations.py.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "earthquakes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("longitude", sa.Float, nullable=True),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("depth_km", sa.Float, nullable=True),
        sa.Column("magnitude", sa.Float, nullable=True),
        sa.Column("magnitude_type", sa.String(10), nullable=True),
        sa.Column("occurred_at", TIMESTAMP(timezone=True), nullable=True),
        sa.Column("place", sa.Text, nullable=True),
        sa.Column("depth_layer", sa.SmallInteger, nullable=True),
        sa.Column("lat_band", sa.SmallInteger, nullable=True),
        sa.Column("lon_index", sa.SmallInteger, nullable=True),
        sa.Column("raw_properties", JSONB, nullable=True),
        sa.Column(
            "fetched_at", TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("idx_eq_cell", "earthquakes", ["depth_layer", "lat_band", "lon_index"])
    op.create_index("idx_eq_occurred", "earthquakes", ["occurred_at"])


def downgrade() -> None:
    op.drop_table("earthquakes")
