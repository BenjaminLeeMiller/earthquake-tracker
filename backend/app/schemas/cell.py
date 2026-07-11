from datetime import datetime

from pydantic import BaseModel


class CellRow(BaseModel):
    """Compact row: [lat_band, lon_index, center_lat, center_lon, eq_count, max_mag]"""

    lat_band: int
    lon_index: int
    center_lat: float
    center_lon: float
    eq_count: int
    max_magnitude: float | None


class GlobeCellsResponse(BaseModel):
    depth_layer: int
    cells: list[list]  # flat array of 6-element lists for Three.js performance


class GlobeStats(BaseModel):
    total_earthquakes: int
    earliest: datetime | None
    latest: datetime | None
    active_layers: list[int]
    last_fetched: datetime | None
