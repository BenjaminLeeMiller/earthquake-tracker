"""Tests for /api/earthquakes routes."""
from datetime import datetime, timezone

import httpx
import pytest

from app.config import settings
from app.models.earthquake import Earthquake

from .factories import make_feature, make_feature_collection

pytestmark = pytest.mark.db


def _quake(id: str, magnitude: float, occurred_at: datetime) -> Earthquake:
    return Earthquake(id=id, magnitude=magnitude, occurred_at=occurred_at, latitude=1.0, longitude=1.0)


class TestListEarthquakes:
    async def test_pagination(self, client, db_session):
        base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
        db_session.add_all(
            [_quake(f"q{i}", 3.0, base_time) for i in range(5)]
        )
        await db_session.commit()

        resp = await client.get("/api/earthquakes", params={"limit": 2, "offset": 0})
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 5
        assert len(body["items"]) == 2

        resp2 = await client.get("/api/earthquakes", params={"limit": 2, "offset": 4})
        assert len(resp2.json()["items"]) == 1

    async def test_default_min_mag_excludes_negative_magnitude(self, client, db_session):
        t = datetime(2024, 1, 1, tzinfo=timezone.utc)
        db_session.add_all(
            [
                _quake("neg", -0.5, t),
                _quake("zero", 0.0, t),
                _quake("pos", 1.0, t),
            ]
        )
        await db_session.commit()

        resp = await client.get("/api/earthquakes")
        ids = {item["id"] for item in resp.json()["items"]}
        assert ids == {"zero", "pos"}

    async def test_explicit_min_mag_sentinel_includes_all(self, client, db_session):
        t = datetime(2024, 1, 1, tzinfo=timezone.utc)
        db_session.add_all(
            [
                _quake("neg", -0.5, t),
                _quake("zero", 0.0, t),
                _quake("pos", 1.0, t),
            ]
        )
        await db_session.commit()

        resp = await client.get("/api/earthquakes", params={"min_mag": -1.0})
        ids = {item["id"] for item in resp.json()["items"]}
        assert ids == {"neg", "zero", "pos"}


class TestTriggerRefresh:
    async def test_refresh_ingests_data_via_background_task(self, client, db_session, usgs_mock):
        feature = make_feature(id="us_refresh_1")
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection([feature]))
        )

        resp = await client.post("/api/earthquakes/refresh")
        assert resp.status_code == 200
        assert resp.json() == {"status": "refresh started"}

        # BackgroundTasks run inline under ASGITransport before the response
        # is returned, so the ingested row is already visible here.
        list_resp = await client.get("/api/earthquakes", params={"min_mag": -1.0})
        ids = {item["id"] for item in list_resp.json()["items"]}
        assert "us_refresh_1" in ids
