"""Tests for /api/globe routes."""
from datetime import datetime, timezone

import pytest

from app.models.earthquake import Earthquake
from app.services.aggregator import rebuild_aggregates
from app.services.grid import coords_to_cell

pytestmark = pytest.mark.db


class TestGetEarthquakes:
    async def test_returns_all_unpaginated(self, client, db_session):
        t = datetime(2024, 1, 1, tzinfo=timezone.utc)
        db_session.add_all(
            [Earthquake(id=f"q{i}", magnitude=1.0, occurred_at=t) for i in range(3)]
        )
        await db_session.commit()

        resp = await client.get("/api/globe/earthquakes")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 3
        assert len(body["items"]) == 3


class TestGetCells:
    async def test_flat_array_shape_and_rounding(self, client, db_session):
        cell = coords_to_cell(35.6, 139.7, 10.0)
        db_session.add(
            Earthquake(
                id="q1", latitude=35.6, longitude=139.7, depth_km=10.0, magnitude=4.5678,
                occurred_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                depth_layer=cell.depth_layer, lat_band=cell.lat_band, lon_index=cell.lon_index,
            )
        )
        await db_session.commit()
        await rebuild_aggregates(db_session)

        resp = await client.get("/api/globe/cells", params={"depth_layer": cell.depth_layer})
        assert resp.status_code == 200
        body = resp.json()
        assert body["depth_layer"] == cell.depth_layer
        assert len(body["cells"]) == 1
        row = body["cells"][0]
        assert len(row) == 6
        lat_band, lon_index, center_lat, center_lon, eq_count, max_mag = row
        assert lat_band == cell.lat_band
        assert lon_index == cell.lon_index
        assert eq_count == 1
        assert max_mag == 4.57  # rounded to 2 places

    async def test_depth_layer_out_of_range_is_422(self, client):
        resp = await client.get("/api/globe/cells", params={"depth_layer": 90})
        assert resp.status_code == 422

        resp2 = await client.get("/api/globe/cells", params={"depth_layer": -1})
        assert resp2.status_code == 422

    async def test_empty_layer_returns_empty_cells(self, client):
        resp = await client.get("/api/globe/cells", params={"depth_layer": 5})
        assert resp.status_code == 200
        assert resp.json()["cells"] == []


class TestGetStats:
    async def test_stats_reflect_seeded_and_aggregated_data(self, client, db_session):
        t1 = datetime(2024, 1, 1, tzinfo=timezone.utc)
        t2 = datetime(2024, 6, 1, tzinfo=timezone.utc)
        cell = coords_to_cell(10.0, 20.0, 5.0)
        db_session.add_all(
            [
                Earthquake(
                    id="q1", latitude=10.0, longitude=20.0, depth_km=5.0, magnitude=3.0,
                    occurred_at=t1, depth_layer=cell.depth_layer, lat_band=cell.lat_band,
                    lon_index=cell.lon_index,
                ),
                Earthquake(
                    id="q2", latitude=10.0, longitude=20.0, depth_km=5.0, magnitude=5.0,
                    occurred_at=t2, depth_layer=cell.depth_layer, lat_band=cell.lat_band,
                    lon_index=cell.lon_index,
                ),
            ]
        )
        await db_session.commit()
        await rebuild_aggregates(db_session)

        resp = await client.get("/api/globe/stats")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_earthquakes"] == 2
        assert body["earliest"].startswith("2024-01-01")
        assert body["latest"].startswith("2024-06-01")
        assert body["active_layers"] == [cell.depth_layer]

    async def test_stats_on_empty_db(self, client):
        resp = await client.get("/api/globe/stats")
        body = resp.json()
        assert body["total_earthquakes"] == 0
        assert body["earliest"] is None
        assert body["latest"] is None
        assert body["active_layers"] == []
