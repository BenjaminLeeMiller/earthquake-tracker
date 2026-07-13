"""Earthquake list and manual refresh endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.earthquake import Earthquake
from app.schemas.earthquake import EarthquakeListResponse
from app.services.ingestor import run_hourly_refresh

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/earthquakes", tags=["earthquakes"])


@router.get("", response_model=EarthquakeListResponse)
async def list_earthquakes(
    min_mag: float = Query(0.0, ge=-1.0),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Paginated earthquake list, optionally filtered by minimum magnitude."""
    base = select(Earthquake)
    if min_mag > -1.0:
        base = base.where(Earthquake.magnitude >= min_mag)

    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    result = await db.execute(
        base.order_by(Earthquake.occurred_at.desc()).limit(limit).offset(offset)
    )
    items = result.scalars().all()

    return EarthquakeListResponse(total=total or 0, items=items)


@router.post("/refresh")
async def trigger_refresh(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger a USGS data refresh (runs in background)."""
    background_tasks.add_task(run_hourly_refresh, db)
    return {"status": "refresh started"}
