"""FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import settings
from app.database import AsyncSessionLocal, create_tables
from app.services.ingestor import run_initial_load
from app.tasks.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up …")
    await create_tables()
    async with AsyncSessionLocal() as session:
        await run_initial_load(session)
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Shut down complete")


app = FastAPI(title="Earthquake Tracker", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
