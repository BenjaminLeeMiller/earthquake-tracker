from datetime import datetime

from sqlalchemy import Index, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Earthquake(Base):
    __tablename__ = "earthquakes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    longitude: Mapped[float | None]
    latitude: Mapped[float | None]
    depth_km: Mapped[float | None]
    magnitude: Mapped[float | None]
    magnitude_type: Mapped[str | None] = mapped_column(String(10))
    occurred_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    place: Mapped[str | None] = mapped_column(Text)
    # Precomputed cell coordinates
    depth_layer: Mapped[int | None] = mapped_column(SmallInteger)
    lat_band: Mapped[int | None] = mapped_column(SmallInteger)
    lon_index: Mapped[int | None] = mapped_column(SmallInteger)
    raw_properties: Mapped[dict | None] = mapped_column(JSONB)
    fetched_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()"
    )

    __table_args__ = (
        Index("idx_eq_cell", "depth_layer", "lat_band", "lon_index"),
        Index("idx_eq_occurred", "occurred_at"),
    )
