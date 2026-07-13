"""APScheduler hourly refresh task."""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import AsyncSessionLocal
from app.services.ingestor import run_hourly_refresh

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def _refresh_job() -> None:
    async with AsyncSessionLocal() as session:
        await run_hourly_refresh(session)


def start_scheduler() -> None:
    scheduler.add_job(_refresh_job, "interval", hours=1, id="hourly_refresh")
    scheduler.start()
    logger.info("Scheduler started — hourly refresh enabled")


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
