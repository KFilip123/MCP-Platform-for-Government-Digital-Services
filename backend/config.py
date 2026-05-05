from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash-lite"
    JWT_SECRET: str = "change-me-in-production"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DB_PATH: Path = Path(__file__).parent.parent / "storage" / "app.db"

    class Config:
        env_file = ".env"


settings = Settings()
