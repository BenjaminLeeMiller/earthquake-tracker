from datetime import datetime

from sqlalchemy import Index, SmallInteger
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CellAggregate(Base):
    __tablename__ = "cell_aggregates"

    depth_layer: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    lat_band: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    lon_index: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    eq_count: Mapped[int]
    max_magnitude: Mapped[float | None]
    avg_magnitude: Mapped[float | None]
    latest_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    center_lat: Mapped[float | None]
    center_lon: Mapped[float | None]
    center_depth_km: Mapped[float | None]

    __table_args__ = (Index("idx_cell_depth", "depth_layer"),)
