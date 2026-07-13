"""Shared test fixtures.

IMPORTANT: DATABASE_URL must be set before the first `app.*` import in this
process, since app.config.settings / app.database.engine are module-level
singletons built at import time. Pytest always imports conftest.py before
any test module in the same directory, so setting it here — before this
file's own `from app...` imports below — is sufficient.
"""

import os

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://eq_user:eq_pass@localhost:5433/earthquake_test_db",
)

from urllib.parse import urlsplit, urlunsplit  # noqa: E402

import asyncpg  # noqa: E402
import httpx  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
import respx  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import AsyncSessionLocal, create_tables, engine, get_db  # noqa: E402


async def _ensure_test_database(database_url: str) -> None:
    """CREATE DATABASE for the test DB if it doesn't already exist.

    Uses a raw asyncpg connection to Postgres's `postgres` maintenance
    database rather than the app's own engine, since CREATE DATABASE
    cannot run inside a transaction block.
    """
    plain = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    parts = urlsplit(plain)
    target_db = parts.path.lstrip("/")
    admin_url = urlunsplit(parts._replace(path="/postgres"))

    conn = await asyncpg.connect(admin_url)
    try:
        await conn.execute(f'CREATE DATABASE "{target_db}"')
    except asyncpg.exceptions.DuplicateDatabaseError:
        pass
    finally:
        await conn.close()


@pytest_asyncio.fixture(scope="session")
async def _prepare_database():
    # Deliberately NOT autouse: only tests that actually request db_session
    # (or client, which depends on it) — i.e. tests marked `db` — should
    # touch Postgres at all. Contributors without it running locally can
    # still run `pytest -m "not db"` for the offline subset.
    await _ensure_test_database(settings.DATABASE_URL)
    await create_tables()
    yield
    await engine.dispose()


@pytest_asyncio.fixture
async def _clean_tables(_prepare_database):
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("TRUNCATE TABLE earthquakes, cell_aggregates RESTART IDENTITY CASCADE")
        )
        await session.commit()
    yield


@pytest_asyncio.fixture
async def db_session(_clean_tables):
    async with AsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    """An httpx.AsyncClient wired to the real FastAPI app via ASGITransport.

    ASGITransport never sends the ASGI `lifespan` scope, so the app's real
    lifespan (create_tables/run_initial_load/start_scheduler) never runs —
    no live USGS calls, no real scheduler startup. get_db is overridden to
    hand out the same db_session used for seeding, so seeded rows and
    endpoint reads/writes share one connection.
    """
    from app.main import app

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def usgs_mock():
    with respx.mock(assert_all_called=False) as m:
        yield m
