"""Helpers for building synthetic USGS-shaped data in tests."""
from __future__ import annotations


def make_feature(
    id: str = "us70000001",
    mag: float | None = 4.5,
    mag_type: str = "mb",
    place: str = "10 km NW of Testville",
    lon: float = 139.7,
    lat: float = 35.6,
    depth_km: float | None = 10.0,
    time_ms: int = 1_700_000_000_000,
) -> dict:
    """Build a GeoJSON feature dict shaped like a USGS API response entry."""
    coords = [lon, lat] if depth_km is None else [lon, lat, depth_km]
    return {
        "id": id,
        "properties": {
            "mag": mag,
            "magType": mag_type,
            "place": place,
            "time": time_ms,
        },
        "geometry": {
            "type": "Point",
            "coordinates": coords,
        },
    }


def make_feature_collection(features: list[dict]) -> dict:
    return {"type": "FeatureCollection", "features": features}
