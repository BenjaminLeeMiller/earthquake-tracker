"""Tests for the USGS FDSN client — pure parsing + respx-mocked HTTP."""

from datetime import UTC, datetime

import httpx
import pytest

from app.config import settings
from app.services.usgs_client import fetch_earthquakes, parse_feature

from .factories import make_feature, make_feature_collection


class TestParseFeature:
    def test_happy_path(self):
        feature = make_feature(
            id="us70000123",
            mag=5.2,
            mag_type="mww",
            place="Somewhere",
            lon=140.0,
            lat=36.0,
            depth_km=15.0,
            time_ms=1_700_000_000_000,
        )
        parsed = parse_feature(feature)
        assert parsed is not None
        assert parsed["id"] == "us70000123"
        assert parsed["longitude"] == 140.0
        assert parsed["latitude"] == 36.0
        assert parsed["depth_km"] == 15.0
        assert parsed["magnitude"] == 5.2
        assert parsed["magnitude_type"] == "mww"
        assert parsed["place"] == "Somewhere"
        assert parsed["occurred_at"] == datetime.fromtimestamp(1_700_000_000, tz=UTC)
        assert parsed["raw_properties"]["mag"] == 5.2

    def test_id_truncated_to_32_chars(self):
        long_id = "a" * 50
        feature = make_feature(id=long_id)
        parsed = parse_feature(feature)
        assert parsed is not None
        assert parsed["id"] == "a" * 32

    def test_missing_id_returns_none(self):
        feature = make_feature(id="")
        assert parse_feature(feature) is None

    def test_missing_depth_is_none(self):
        feature = make_feature(depth_km=None)
        parsed = parse_feature(feature)
        assert parsed is not None
        assert parsed["depth_km"] is None

    def test_missing_time_gives_none_occurred_at(self):
        feature = make_feature()
        del feature["properties"]["time"]
        parsed = parse_feature(feature)
        assert parsed is not None
        assert parsed["occurred_at"] is None

    def test_malformed_coordinates_returns_none(self):
        feature = make_feature()
        feature["geometry"]["coordinates"] = None
        assert parse_feature(feature) is None

    def test_malformed_properties_returns_none(self):
        feature = {"id": "us1", "properties": None, "geometry": {"coordinates": [1, 2, 3]}}
        assert parse_feature(feature) is None


class TestFetchEarthquakes:
    async def test_simple_fetch_no_split(self, usgs_mock):
        features = [make_feature(id=f"us{i:08d}") for i in range(5)]
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            return_value=httpx.Response(200, json=make_feature_collection(features))
        )

        start = datetime(2024, 1, 1, tzinfo=UTC)
        end = datetime(2024, 1, 2, tzinfo=UTC)
        result = await fetch_earthquakes(start, end)

        assert len(result) == 5
        assert usgs_mock.calls.call_count == 1

    async def test_splits_when_hitting_20k_limit(self, usgs_mock):
        big = make_feature_collection([make_feature(id=f"big{i:08d}") for i in range(20_000)])
        half_a = make_feature_collection([make_feature(id=f"a{i:08d}") for i in range(3)])
        half_b = make_feature_collection([make_feature(id=f"b{i:08d}") for i in range(4)])

        usgs_mock.get(settings.USGS_BASE_URL).mock(
            side_effect=[
                httpx.Response(200, json=big),
                httpx.Response(200, json=half_a),
                httpx.Response(200, json=half_b),
            ]
        )

        start = datetime(2024, 1, 1, tzinfo=UTC)
        end = datetime(2024, 1, 3, tzinfo=UTC)
        result = await fetch_earthquakes(start, end)

        assert usgs_mock.calls.call_count == 3
        assert len(result) == 7  # 3 + 4, not the 20,000 from the oversized first call

    async def test_retries_transient_500_then_succeeds(self, usgs_mock, monkeypatch):
        monkeypatch.setattr("app.services.usgs_client.BACKOFF_BASE_SECONDS", 0)
        ok = make_feature_collection([make_feature(id="us_after_retry")])
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            side_effect=[httpx.Response(500), httpx.Response(200, json=ok)]
        )

        start = datetime(2024, 1, 1, tzinfo=UTC)
        end = datetime(2024, 1, 2, tzinfo=UTC)
        result = await fetch_earthquakes(start, end)

        assert len(result) == 1
        assert usgs_mock.calls.call_count == 2

    async def test_gives_up_after_max_attempts_on_persistent_500(self, usgs_mock, monkeypatch):
        monkeypatch.setattr("app.services.usgs_client.BACKOFF_BASE_SECONDS", 0)
        usgs_mock.get(settings.USGS_BASE_URL).mock(return_value=httpx.Response(500))

        start = datetime(2024, 1, 1, tzinfo=UTC)
        end = datetime(2024, 1, 2, tzinfo=UTC)
        with pytest.raises(httpx.HTTPStatusError):
            await fetch_earthquakes(start, end)
        assert usgs_mock.calls.call_count == 3  # MAX_ATTEMPTS

    async def test_client_error_4xx_is_not_retried(self, usgs_mock, monkeypatch):
        monkeypatch.setattr("app.services.usgs_client.BACKOFF_BASE_SECONDS", 0)
        usgs_mock.get(settings.USGS_BASE_URL).mock(return_value=httpx.Response(400))

        start = datetime(2024, 1, 1, tzinfo=UTC)
        end = datetime(2024, 1, 2, tzinfo=UTC)
        with pytest.raises(httpx.HTTPStatusError):
            await fetch_earthquakes(start, end)
        assert usgs_mock.calls.call_count == 1

    async def test_retries_network_error_then_succeeds(self, usgs_mock, monkeypatch):
        monkeypatch.setattr("app.services.usgs_client.BACKOFF_BASE_SECONDS", 0)
        ok = make_feature_collection([make_feature(id="us_after_neterr")])
        usgs_mock.get(settings.USGS_BASE_URL).mock(
            side_effect=[httpx.ConnectError("boom"), httpx.Response(200, json=ok)]
        )

        start = datetime(2024, 1, 1, tzinfo=UTC)
        end = datetime(2024, 1, 2, tzinfo=UTC)
        result = await fetch_earthquakes(start, end)

        assert len(result) == 1
        assert usgs_mock.calls.call_count == 2
