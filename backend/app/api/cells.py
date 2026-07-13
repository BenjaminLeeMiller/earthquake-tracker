"""Cell detail endpoint: earthquakes in a specific cell."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.earthquake import Earthquake
from app.schemas.earthquake import EarthquakeOut

router = APIRouter(prefix="/cells", tags=["cells"])


@router.get("/{layer}/{lat_band}/{lon_index}", response_model=list[EarthquakeOut])
async def get_cell_earthquakes(
    layer: int,
    lat_band: int,
    lon_index: int,
    db: AsyncSession = Depends(get_db),
):
    """Return all earthquakes in a given cell, sorted by time descending."""
    result = await db.execute(
        select(Earthquake)
        .where(
            Earthquake.depth_layer == layer,
            Earthquake.lat_band == lat_band,
            Earthquake.lon_index == lon_index,
        )
        .order_by(Earthquake.occurred_at.desc())
    )
    quakes = result.scalars().all()
    if not quakes:
        raise HTTPException(status_code=404, detail="No earthquakes found in this cell")
    return quakes
