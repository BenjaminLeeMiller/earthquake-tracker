"""Tests for the APScheduler hourly refresh job registration.

Only registration/configuration is asserted, never actual execution — the
job interval is 1 hour, far too long to wait for in a test, and there's no
clock-mocking tooling wired up for APScheduler here.
"""
import asyncio

import pytest

from apscheduler.triggers.interval import IntervalTrigger

from app.tasks.scheduler import scheduler, start_scheduler, stop_scheduler


@pytest.fixture
def scheduler_lifecycle():
    yield
    # Always stop the scheduler after the test, even on failure, so a
    # leftover running scheduler doesn't bleed into any other test in the
    # session. Guarded since a test may have already stopped it itself
    # (stop_scheduler() raises if the scheduler isn't running already).
    if scheduler.running:
        stop_scheduler()
    # shutdown() doesn't clear the jobstore, so a job left registered from
    # this test would make the next test's start_scheduler() raise
    # ConflictingIdError on add_job. remove_all_jobs() is safe to call
    # even if nothing is registered.
    scheduler.remove_all_jobs()


class TestScheduler:
    # async, not sync: AsyncIOScheduler discovers the running event loop
    # when started, so it needs to actually be started from inside one.
    async def test_start_registers_hourly_job(self, scheduler_lifecycle):
        start_scheduler()

        job = scheduler.get_job("hourly_refresh")
        assert job is not None
        assert isinstance(job.trigger, IntervalTrigger)
        assert job.trigger.interval.total_seconds() == 3600

    async def test_stop_shuts_down_scheduler(self, scheduler_lifecycle):
        start_scheduler()
        assert scheduler.running is True

        stop_scheduler()
        # AsyncIOScheduler.shutdown() defers its actual state transition via
        # call_soon_threadsafe rather than performing it synchronously — the
        # scheduled callback needs one trip through the event loop before
        # `running` reflects it.
        await asyncio.sleep(0)
        assert scheduler.running is False
