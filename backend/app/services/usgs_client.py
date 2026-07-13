"""USGS FDSN earthquake API client."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

USGS_LIMIT = 20_000


async def fetch_earthquakes(
    start: datetime,
    end: datetime,
    min_magnitude: float = -1.0,
) -> list[dict]:
    """
    Fetch all earthquakes between start and end by recursively splitting
    time windows when the result set hits the 20,000-event cap.
    """
    results: list[dict] = []
    await _fetch_recursive(start, end, min_magnitude, results)
    return results


async def _fetch_recursive(
    start: datetime,
    end: datetime,
    min_magnitude: float,
    results: list[dict],
) -> None:
    params = {
        "format": "geojson",
        "starttime": start.strftime("%Y-%m-%dT%H:%M:%S"),
        "endtime": end.strftime("%Y-%m-%dT%H:%M:%S"),
        "minmagnitude": str(min_magnitude),
        "limit": str(USGS_LIMIT),
        "orderby": "time-asc",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        logger.info(
            "USGS fetch: %s → %s",
            start.strftime("%Y-%m-%d"),
            end.strftime("%Y-%m-%d"),
        )
        response = await client.get(settings.USGS_BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()

    features = data.get("features", [])
    count = len(features)
    logger.info("Got %d events", count)

    if count >= USGS_LIMIT:
        # Split the window in half and recurse
        mid = datetime.fromtimestamp((start.timestamp() + end.timestamp()) / 2, tz=UTC)
        await _fetch_recursive(start, mid, min_magnitude, results)
        await _fetch_recursive(mid, end, min_magnitude, results)
    else:
        results.extend(features)


def parse_feature(feature: dict) -> dict | None:
    """Parse a GeoJSON feature into a flat dict suitable for the ORM."""
    try:
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        coords = geom.get("coordinates", [None, None, None])
        event_id = feature.get("id")
        if not event_id:
            return None

        lon, lat, depth_km = (
            coords[0],
            coords[1],
            coords[2] if len(coords) > 2 else None,
        )

        time_ms = props.get("time")
        occurred_at = datetime.fromtimestamp(time_ms / 1000, tz=UTC) if time_ms else None

        return {
            "id": event_id[:32],
            "longitude": lon,
            "latitude": lat,
            "depth_km": float(depth_km) if depth_km is not None else None,
            "magnitude": props.get("mag"),
            "magnitude_type": props.get("magType"),
            "occurred_at": occurred_at,
            "place": props.get("place"),
            "raw_properties": props,
        }
    except Exception as exc:
        logger.warning("Failed to parse feature %s: %s", feature.get("id"), exc)
        return None
