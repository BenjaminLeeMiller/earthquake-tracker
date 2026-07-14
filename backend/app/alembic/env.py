"""Alembic environment.

Two entry paths:

- **App startup** (app/migrations.py): the caller opens an async connection
  and passes its sync facade in via ``config.attributes["connection"]`` —
  we run migrations directly on it, no second engine.
- **Alembic CLI** (``alembic -c backend/alembic.ini ...``, dev only): no
  connection is provided, so we build an async engine from the app settings
  and drive the sync migration runner through it.
"""

from __future__ import annotations

import asyncio

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

import app.models  # noqa: F401 — register models on Base.metadata
from app.config import settings
from app.database import Base

config = context.config
target_metadata = Base.metadata


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def _run_async_migrations() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection", None)
    if connection is not None:
        do_run_migrations(connection)
    else:
        asyncio.run(_run_async_migrations())


run_migrations_online()
