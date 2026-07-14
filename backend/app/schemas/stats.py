from datetime import datetime

from pydantic import BaseModel


class GlobeStats(BaseModel):
    total_earthquakes: int
    earliest: datetime | None
    latest: datetime | None
    last_fetched: datetime | None
