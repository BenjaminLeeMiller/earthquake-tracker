"""Drop the unused cell_aggregates table.

The cell-aggregate subsystem (model, aggregator service, /globe/cells and
/cells endpoints) was removed from the codebase; this cleans the orphaned
table out of databases created before that removal. IF EXISTS keeps it a
no-op on fresh databases, which never had the table.
"""

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS cell_aggregates")


def downgrade() -> None:
    # The aggregates were derived data, rebuilt from the earthquakes table
    # on every ingest — nothing to restore beyond the (removed) code that
    # populated it, so downgrade is intentionally a no-op.
    pass
