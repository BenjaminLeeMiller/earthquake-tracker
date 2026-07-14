"""Tests for the programmatic Alembic startup runner."""

import pytest
from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.migrations import run_migrations

pytestmark = pytest.mark.db


class TestRunMigrations:
    async def test_stamps_pre_alembic_db_then_upgrades_to_head(self, db_session):
        # Force the exact state of a database created before Alembic was
        # adopted: earthquakes table exists (create_all), no alembic_version.
        # run_migrations must stamp the baseline rather than try to
        # re-create the earthquakes table, then upgrade to head.
        async with AsyncSessionLocal() as session:
            await session.execute(text("DROP TABLE IF EXISTS alembic_version"))
            await session.commit()

        await run_migrations()

        async with AsyncSessionLocal() as session:
            version = await session.scalar(text("SELECT version_num FROM alembic_version"))
        assert version == "002"

    async def test_rerun_is_idempotent(self, db_session):
        await run_migrations()
        await run_migrations()

        async with AsyncSessionLocal() as session:
            version = await session.scalar(text("SELECT version_num FROM alembic_version"))
        assert version == "002"
