"""Tests for /api/cells/{layer}/{lat_band}/{lon_index}."""

from datetime import UTC, datetime

import pytest

from app.models.earthquake import Earthquake
from app.services.grid import coords_to_cell

pytestmark = pytest.mark.db


class TestGetCellEarthquakes:
    async def test_404_when_cell_empty(self, client):
        resp = await client.get("/api/cells/0/100/100")
        assert resp.status_code == 404

    async def test_returns_earthquakes_in_cell_sorted_desc(self, client, db_session):
        cell = coords_to_cell(35.6, 139.7, 10.0)
        older = datetime(2024, 1, 1, tzinfo=UTC)
        newer = datetime(2024, 6, 1, tzinfo=UTC)
        db_session.add_all(
            [
                Earthquake(
                    id="old",
                    latitude=35.6,
                    longitude=139.7,
                    depth_km=10.0,
                    magnitude=3.0,
                    occurred_at=older,
                    depth_layer=cell.depth_layer,
                    lat_band=cell.lat_band,
                    lon_index=cell.lon_index,
                ),
                Earthquake(
                    id="new",
                    latitude=35.6,
                    longitude=139.7,
                    depth_km=10.0,
                    magnitude=4.0,
                    occurred_at=newer,
                    depth_layer=cell.depth_layer,
                    lat_band=cell.lat_band,
                    lon_index=cell.lon_index,
                ),
            ]
        )
        await db_session.commit()

        resp = await client.get(f"/api/cells/{cell.depth_layer}/{cell.lat_band}/{cell.lon_index}")
        assert resp.status_code == 200
        body = resp.json()
        assert [item["id"] for item in body] == ["new", "old"]
