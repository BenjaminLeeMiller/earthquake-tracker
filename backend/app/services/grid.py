"""
Spherical grid math: divides Earth into ~5-mile surface cells per depth layer.
"""

from __future__ import annotations

from math import cos, floor, pi, radians, sin
from typing import NamedTuple

EARTH_RADIUS_MILES = 3959.0
EARTH_CIRCUMFERENCE = 2 * pi * EARTH_RADIUS_MILES  # 24,873.6 mi
CELL_SIZE_MILES = 5.0
CELL_SIZE_KM = CELL_SIZE_MILES * 1.60934  # 8.047 km

# Degrees of latitude per band (so each band is ~5 miles tall)
LAT_DEG_PER_BAND = 360 * CELL_SIZE_MILES / EARTH_CIRCUMFERENCE  # ~0.07234°
TOTAL_LAT_BANDS = round(180 / LAT_DEG_PER_BAND)  # ~2489

# Depth layers: 0 = 0–5 mi, 1 = 5–10 mi, ..., 89 = 445–450 mi
MAX_DEPTH_LAYERS = 90  # indices 0..89


class CellID(NamedTuple):
    depth_layer: int
    lat_band: int
    lon_index: int


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def cells_in_lat_band(lat_band: int) -> int:
    """Number of longitude cells in a given latitude band."""
    center_lat = -90 + (lat_band + 0.5) * LAT_DEG_PER_BAND
    return max(1, round(360 * cos(radians(center_lat)) / LAT_DEG_PER_BAND))


def coords_to_cell(lat: float, lon: float, depth_km: float) -> CellID:
    """Convert geographic coordinates to a CellID."""
    depth_layer = _clamp(floor(depth_km / CELL_SIZE_KM), 0, MAX_DEPTH_LAYERS - 1)
    lat_band = _clamp(floor((lat + 90) / LAT_DEG_PER_BAND), 0, TOTAL_LAT_BANDS - 1)
    n = cells_in_lat_band(lat_band)
    lon_norm = (lon + 180) % 360
    lon_index = _clamp(floor(lon_norm / (360 / n)), 0, n - 1)
    return CellID(depth_layer, lat_band, lon_index)


def cell_center(cell: CellID) -> tuple[float, float, float]:
    """Return (center_lat, center_lon, center_depth_km) of a cell."""
    center_lat = -90 + (cell.lat_band + 0.5) * LAT_DEG_PER_BAND
    n = cells_in_lat_band(cell.lat_band)
    lon_step = 360 / n
    center_lon = -180 + (cell.lon_index + 0.5) * lon_step
    center_depth_km = (cell.depth_layer + 0.5) * CELL_SIZE_KM
    return center_lat, center_lon, center_depth_km


def lat_lon_to_xyz(lat: float, lon: float, radius: float = 1.0) -> tuple[float, float, float]:
    """Convert lat/lon (degrees) to unit sphere XYZ (Y-up convention)."""
    x = radius * cos(radians(lat)) * sin(radians(lon))
    y = radius * sin(radians(lat))
    z = radius * cos(radians(lat)) * cos(radians(lon))
    return x, y, z
