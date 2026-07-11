"""Fetch USGS data, upsert into DB, then rebuild cell aggregates."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.earthquake import Earthquake
from app.services.aggregator import rebuild_aggregates
from app.services.grid import coords_to_cell
from app.services.usgs_client import fetch_earthquakes, parse_feature

logger = logging.getLogger(__name__)


async def run_initial_load(session: AsyncSession) -> None:
    """Full 30-day backfill if the table is empty."""
    count = (await session.execute(select(Earthquake).limit(1))).first()
    if count is not None:
        logger.info("DB already populated — skipping initial load")
        return

    logger.info("Starting initial 30-day backfill …")
    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=settings.FETCH_WINDOW_DAYS)
    await _ingest_window(session, start, end)


async def run_hourly_refresh(session: AsyncSession) -> None:
    """Fetch the last REFRESH_OVERLAP_HOURS to catch revisions."""
    logger.info("Running hourly refresh …")
    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(hours=settings.REFRESH_OVERLAP_HOURS)
    await _ingest_window(session, start, end)


async def _ingest_window(session: AsyncSession, start: datetime, end: datetime) -> None:
    features = await fetch_earthquakes(start, end)
    logger.info("Ingesting %d features …", len(features))

    rows: list[dict] = []
    for feat in features:
        parsed = parse_feature(feat)
        if parsed is None:
            continue

        lat = parsed.get("latitude")
        lon = parsed.get("longitude")
        depth = parsed.get("depth_km")

        if lat is not None and lon is not None and depth is not None:
            cell = coords_to_cell(lat, lon, max(0.0, depth))
            parsed["depth_layer"] = cell.depth_layer
            parsed["lat_band"] = cell.lat_band
            parsed["lon_index"] = cell.lon_index
        else:
            parsed["depth_layer"] = None
            parsed["lat_band"] = None
            parsed["lon_index"] = None

        rows.append(parsed)

    if not rows:
        logger.warning("No rows to ingest")
        return

    # Batch upsert
    BATCH = 2000
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]
        stmt = pg_insert(Earthquake).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "magnitude": stmt.excluded.magnitude,
                "magnitude_type": stmt.excluded.magnitude_type,
                "place": stmt.excluded.place,
                "raw_properties": stmt.excluded.raw_properties,
                "depth_layer": stmt.excluded.depth_layer,
                "lat_band": stmt.excluded.lat_band,
                "lon_index": stmt.excluded.lon_index,
                "fetched_at": stmt.excluded.fetched_at,
            },
        )
        await session.execute(stmt)
        await session.commit()
        logger.info("Upserted batch %d/%d", min(i + BATCH, len(rows)), len(rows))

    await rebuild_aggregates(session)
