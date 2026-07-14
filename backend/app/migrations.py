"""Run Alembic migrations programmatically at app startup.

Replaces the old ``Base.metadata.create_all`` startup, which could only
create missing tables — it silently ignored any change to an existing
table, so the first real schema change against a populated database would
never have applied.
"""

from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.database import engine

logger = logging.getLogger(__name__)

SCRIPT_LOCATION = Path(__file__).resolve().parent / "alembic"

# The revision whose schema matches what create_all used to produce —
# pre-Alembic databases get stamped with this instead of re-running it.
BASELINE_REVISION = "001"


def _alembic_config(sync_connection) -> Config:
    # Built in code (no alembic.ini needed at runtime) so the Docker image
    # only needs the app/ tree; backend/alembic.ini exists purely for the
    # dev-machine CLI.
    cfg = Config()
    cfg.set_main_option("script_location", str(SCRIPT_LOCATION))
    cfg.attributes["connection"] = sync_connection
    return cfg


def _upgrade(sync_connection) -> None:
    cfg = _alembic_config(sync_connection)
    tables = inspect(sync_connection).get_table_names()
    if "alembic_version" not in tables and "earthquakes" in tables:
        logger.info("Pre-Alembic database detected — stamping baseline %s", BASELINE_REVISION)
        command.stamp(cfg, BASELINE_REVISION)
    command.upgrade(cfg, "head")


async def run_migrations() -> None:
    logger.info("Running database migrations …")
    async with engine.begin() as conn:
        await conn.run_sync(_upgrade)
    logger.info("Migrations up to date")
