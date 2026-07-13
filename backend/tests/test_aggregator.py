"""Tests for cell_aggregates rebuilding."""
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.models.cell import CellAggregate
from app.models.earthquake import Earthquake
from app.services.aggregator import rebuild_aggregates
from app.services.grid import coords_to_cell

pytestmark = pytest.mark.db


def _make_earthquake(
    id: str,
    lat: float,
    lon: float,
    depth_km: float,
    magnitude: float,
    occurred_at: datetime,
) -> Earthquake:
    cell = coords_to_cell(lat, lon, depth_km)
    return Earthquake(
        id=id,
        latitude=lat,
        longitude=lon,
        depth_km=depth_km,
        magnitude=magnitude,
        occurred_at=occurred_at,
        depth_layer=cell.depth_layer,
        lat_band=cell.lat_band,
        lon_index=cell.lon_index,
    )


class TestRebuildAggregates:
    async def test_empty_table_gives_zero_rowcount(self, db_session):
        rowcount = await rebuild_aggregates(db_session)
        assert rowcount == 0

    async def test_single_cell_stats(self, db_session):
        # Two quakes landing in the same cell (same lat/lon/depth, close enough).
        t1 = datetime(2024, 1, 1, tzinfo=timezone.utc)
        t2 = datetime(2024, 1, 2, tzinfo=timezone.utc)
        db_session.add_all(
            [
                _make_earthquake("q1", 35.6, 139.7, 10.0, 4.0, t1),
                _make_earthquake("q2", 35.6, 139.7, 10.0, 6.0, t2),
            ]
        )
        await db_session.commit()

        rowcount = await rebuild_aggregates(db_session)
        assert rowcount == 1

        agg = (await db_session.execute(select(CellAggregate))).scalar_one()
        assert agg.eq_count == 2
        assert agg.max_magnitude == 6.0
        assert agg.avg_magnitude == 5.0
        assert agg.latest_at == t2

    async def test_quakes_missing_cell_columns_are_excluded(self, db_session):
        db_session.add(
            Earthquake(
                id="q_no_cell",
                latitude=None,
                longitude=None,
                depth_km=None,
                magnitude=5.0,
                occurred_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                depth_layer=None,
                lat_band=None,
                lon_index=None,
            )
        )
        await db_session.commit()

        rowcount = await rebuild_aggregates(db_session)
        assert rowcount == 0

    async def test_rerun_updates_existing_cell_via_on_conflict(self, db_session):
        t1 = datetime(2024, 1, 1, tzinfo=timezone.utc)
        db_session.add(_make_earthquake("q1", 10.0, 20.0, 5.0, 3.0, t1))
        await db_session.commit()
        await rebuild_aggregates(db_session)

        agg = (await db_session.execute(select(CellAggregate))).scalar_one()
        assert agg.eq_count == 1

        t2 = datetime(2024, 1, 2, tzinfo=timezone.utc)
        db_session.add(_make_earthquake("q2", 10.0, 20.0, 5.0, 7.0, t2))
        await db_session.commit()
        await rebuild_aggregates(db_session)

        # rebuild_aggregates runs raw SQL that bypasses the ORM unit-of-work,
        # so the session's identity map still holds the CellAggregate object
        # fetched above with its old attributes (AsyncSessionLocal is built
        # with expire_on_commit=False) — force a fresh load.
        db_session.expire_all()
        aggregates = (await db_session.execute(select(CellAggregate))).scalars().all()
        assert len(aggregates) == 1  # updated in place, not duplicated
        assert aggregates[0].eq_count == 2
        assert aggregates[0].max_magnitude == 7.0
        assert aggregates[0].latest_at == t2
