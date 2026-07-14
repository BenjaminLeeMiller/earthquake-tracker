from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables() -> None:
    """Create all ORM tables directly (tests only).

    The app itself migrates via Alembic at startup (app/migrations.py);
    this shortcut exists for the test suite, which rebuilds a throwaway
    database per session and doesn't need migration history.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
