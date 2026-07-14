"""Globe endpoints: full quake list and global stats."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.earthquake import Earthquake
from app.schemas.earthquake import EarthquakeListResponse
from app.schemas.stats import GlobeStats

router = APIRouter(prefix="/globe", tags=["globe"])


@router.get("/earthquakes", response_model=EarthquakeListResponse)
async def get_earthquakes(db: AsyncSession = Depends(get_db)):
    """Return all earthquakes, unpaginated."""
    result = await db.execute(select(Earthquake).order_by(Earthquake.occurred_at.desc()))
    items = result.scalars().all()
    return EarthquakeListResponse(total=len(items), items=items)


@router.get("/stats", response_model=GlobeStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Global statistics about the dataset."""
    total = await db.scalar(select(func.count(Earthquake.id)))
    earliest = await db.scalar(select(func.min(Earthquake.occurred_at)))
    latest = await db.scalar(select(func.max(Earthquake.occurred_at)))
    last_fetched = await db.scalar(select(func.max(Earthquake.fetched_at)))

    return GlobeStats(
        total_earthquakes=total or 0,
        earliest=earliest,
        latest=latest,
        last_fetched=last_fetched,
    )
