"""Rebuild cell_aggregates from earthquakes table."""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

REBUILD_SQL = text(
    """
    INSERT INTO cell_aggregates
        (depth_layer, lat_band, lon_index, eq_count, max_magnitude,
         avg_magnitude, latest_at, center_lat, center_lon, center_depth_km)
    SELECT
        depth_layer,
        lat_band,
        lon_index,
        COUNT(*)                        AS eq_count,
        MAX(magnitude)                  AS max_magnitude,
        AVG(magnitude)                  AS avg_magnitude,
        MAX(occurred_at)                AS latest_at,
        AVG(latitude)                   AS center_lat,
        AVG(longitude)                  AS center_lon,
        AVG(depth_km)                   AS center_depth_km
    FROM earthquakes
    WHERE depth_layer IS NOT NULL
      AND lat_band IS NOT NULL
      AND lon_index IS NOT NULL
    GROUP BY depth_layer, lat_band, lon_index
    ON CONFLICT (depth_layer, lat_band, lon_index) DO UPDATE SET
        eq_count        = EXCLUDED.eq_count,
        max_magnitude   = EXCLUDED.max_magnitude,
        avg_magnitude   = EXCLUDED.avg_magnitude,
        latest_at       = EXCLUDED.latest_at,
        center_lat      = EXCLUDED.center_lat,
        center_lon      = EXCLUDED.center_lon,
        center_depth_km = EXCLUDED.center_depth_km
    """
)


async def rebuild_aggregates(session: AsyncSession) -> int:
    """Rebuild all cell aggregates. Returns rowcount."""
    logger.info("Rebuilding cell aggregates …")
    result = await session.execute(REBUILD_SQL)
    await session.commit()
    logger.info("Cell aggregates rebuilt: %d rows affected", result.rowcount)
    return result.rowcount
