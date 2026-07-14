from datetime import datetime

from pydantic import BaseModel


class EarthquakeOut(BaseModel):
    id: str
    longitude: float | None
    latitude: float | None
    depth_km: float | None
    magnitude: float | None
    magnitude_type: str | None
    occurred_at: datetime | None
    place: str | None
    url: str | None = None
    depth_layer: int | None
    lat_band: int | None
    lon_index: int | None

    model_config = {"from_attributes": True}


class EarthquakeListResponse(BaseModel):
    total: int
    items: list[EarthquakeOut]
