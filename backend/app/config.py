from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+asyncpg://eq_user:eq_pass@localhost:5432/earthquake_db"
    USGS_BASE_URL: str = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    FETCH_WINDOW_DAYS: int = 30
    REFRESH_OVERLAP_HOURS: int = 25
    LOG_LEVEL: str = "INFO"


settings = Settings()
