"""Tests for ingestion: initial backfill, hourly refresh, upsert-on-conflict."""

import httpx
import pytest
from sqlalchemy import select

from app.config import settings
from app.models.cell import CellAggregate
from app.models.earthquake import Earthquake
from app.services.ingestor import run_hourly_refresh, run_initial_load

from .factories import make_feature, make_feature_collection

pytestmark = pytest.mark.db


class TestRunInitialLoad:
    async def test_backfills_when_table_empty(self, db_session, usgs_mock):
        features = [make_feature(id="us_initial_1"), make_feature(id="us_initial_2")]
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection(features))
        )

        await run_initial_load(db_session)

        rows = (await db_session.execute(select(Earthquake))).scalars().all()
        assert {r.id for r in rows} == {"us_initial_1", "us_initial_2"}
        assert usgs_mock.calls.call_count == 1

    async def test_skips_when_table_already_populated(self, db_session, usgs_mock):
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection([make_feature()]))
        )
        await run_initial_load(db_session)
        assert usgs_mock.calls.call_count == 1

        # Second call should be a no-op — table is non-empty now.
        await run_initial_load(db_session)
        assert usgs_mock.calls.call_count == 1


class TestRunHourlyRefresh:
    async def test_always_fetches_regardless_of_table_state(self, db_session, usgs_mock):
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection([make_feature()]))
        )
        await run_hourly_refresh(db_session)
        await run_hourly_refresh(db_session)
        assert usgs_mock.calls.call_count == 2

    async def test_computes_cell_columns_and_rebuilds_aggregates(self, db_session, usgs_mock):
        feature = make_feature(id="us_cell_1", lon=139.7, lat=35.6, depth_km=10.0, mag=4.5)
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection([feature]))
        )

        await run_hourly_refresh(db_session)

        row = (
            await db_session.execute(select(Earthquake).where(Earthquake.id == "us_cell_1"))
        ).scalar_one()
        assert row.depth_layer is not None
        assert row.lat_band is not None
        assert row.lon_index is not None

        aggregates = (await db_session.execute(select(CellAggregate))).scalars().all()
        assert len(aggregates) == 1
        assert aggregates[0].eq_count == 1
        assert aggregates[0].max_magnitude == 4.5

    async def test_upsert_updates_existing_row_not_duplicate(self, db_session, usgs_mock):
        original = make_feature(id="us_upsert_1", mag=3.0, place="Original place")
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection([original]))
        )
        await run_hourly_refresh(db_session)

        updated = make_feature(id="us_upsert_1", mag=6.1, place="Revised place")
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection([updated]))
        )
        await run_hourly_refresh(db_session)

        rows = (
            (await db_session.execute(select(Earthquake).where(Earthquake.id == "us_upsert_1")))
            .scalars()
            .all()
        )
        assert len(rows) == 1
        assert rows[0].magnitude == 6.1
        assert rows[0].place == "Revised place"

    async def test_rows_without_coords_get_null_cell_columns(self, db_session, usgs_mock):
        feature = make_feature(id="us_nocoords", depth_km=None)
        feature["geometry"]["coordinates"] = [None, None]
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection([feature]))
        )

        await run_hourly_refresh(db_session)

        row = (
            await db_session.execute(select(Earthquake).where(Earthquake.id == "us_nocoords"))
        ).scalar_one()
        assert row.depth_layer is None
        assert row.lat_band is None
        assert row.lon_index is None

    async def test_no_features_is_a_noop(self, db_session, usgs_mock):
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection([]))
        )
        await run_hourly_refresh(db_session)
        rows = (await db_session.execute(select(Earthquake))).scalars().all()
        assert rows == []
