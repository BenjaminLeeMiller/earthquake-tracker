"""Globe endpoints: cells per layer and global stats."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.cell import CellAggregate
from app.models.earthquake import Earthquake
from app.schemas.cell import GlobeCellsResponse, GlobeStats
from app.schemas.earthquake import EarthquakeListResponse

router = APIRouter(prefix="/globe", tags=["globe"])


@router.get("/earthquakes", response_model=EarthquakeListResponse)
async def get_earthquakes(db: AsyncSession = Depends(get_db)):
    """Return all earthquakes, unpaginated."""
    result = await db.execute(
        select(Earthquake).order_by(Earthquake.occurred_at.desc())
    )
    items = result.scalars().all()
    return EarthquakeListResponse(total=len(items), items=items)


@router.get("/cells", response_model=GlobeCellsResponse)
async def get_cells(
    depth_layer: int = Query(0, ge=0, le=89),
    db: AsyncSession = Depends(get_db),
):
    """Return all non-empty cells for a given depth layer as a compact flat array."""
    result = await db.execute(
        select(CellAggregate).where(CellAggregate.depth_layer == depth_layer)
    )
    cells = result.scalars().all()

    flat: list[list] = [
        [
            c.lat_band,
            c.lon_index,
            round(c.center_lat or 0, 4),
            round(c.center_lon or 0, 4),
            c.eq_count,
            round(c.max_magnitude, 2) if c.max_magnitude is not None else None,
        ]
        for c in cells
    ]
    return GlobeCellsResponse(depth_layer=depth_layer, cells=flat)


@router.get("/stats", response_model=GlobeStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Global statistics about the dataset."""
    total = await db.scalar(select(func.count(Earthquake.id)))
    earliest = await db.scalar(select(func.min(Earthquake.occurred_at)))
    latest = await db.scalar(select(func.max(Earthquake.occurred_at)))
    last_fetched = await db.scalar(select(func.max(Earthquake.fetched_at)))

    layers_result = await db.execute(
        select(CellAggregate.depth_layer)
        .distinct()
        .order_by(CellAggregate.depth_layer)
    )
    active_layers = [r[0] for r in layers_result.all()]

    return GlobeStats(
        total_earthquakes=total or 0,
        earliest=earliest,
        latest=latest,
        active_layers=active_layers,
        last_fetched=last_fetched,
    )
