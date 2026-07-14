"""Tests for /api/globe routes."""

from datetime import UTC, datetime

import pytest

from app.models.earthquake import Earthquake

pytestmark = pytest.mark.db


class TestGetEarthquakes:
    async def test_returns_all_unpaginated(self, client, db_session):
        t = datetime(2024, 1, 1, tzinfo=UTC)
        db_session.add_all([Earthquake(id=f"q{i}", magnitude=1.0, occurred_at=t) for i in range(3)])
        await db_session.commit()

        resp = await client.get("/api/globe/earthquakes")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 3
        assert len(body["items"]) == 3

    async def test_exposes_usgs_event_url_from_raw_properties(self, client, db_session):
        event_url = "https://earthquake.usgs.gov/earthquakes/eventpage/q_url"
        db_session.add_all(
            [
                Earthquake(id="q_url", magnitude=5.0, raw_properties={"url": event_url}),
                Earthquake(id="q_no_url", magnitude=5.0, raw_properties=None),
            ]
        )
        await db_session.commit()

        resp = await client.get("/api/globe/earthquakes")
        items = {item["id"]: item for item in resp.json()["items"]}
        assert items["q_url"]["url"] == event_url
        assert items["q_no_url"]["url"] is None


class TestGetStats:
    async def test_stats_reflect_seeded_data(self, client, db_session):
        t1 = datetime(2024, 1, 1, tzinfo=UTC)
        t2 = datetime(2024, 6, 1, tzinfo=UTC)
        db_session.add_all(
            [
                Earthquake(id="q1", magnitude=3.0, occurred_at=t1),
                Earthquake(id="q2", magnitude=5.0, occurred_at=t2),
            ]
        )
        await db_session.commit()

        resp = await client.get("/api/globe/stats")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_earthquakes"] == 2
        assert body["earliest"].startswith("2024-01-01")
        assert body["latest"].startswith("2024-06-01")

    async def test_stats_on_empty_db(self, client):
        resp = await client.get("/api/globe/stats")
        body = resp.json()
        assert body["total_earthquakes"] == 0
        assert body["earliest"] is None
        assert body["latest"] is None
