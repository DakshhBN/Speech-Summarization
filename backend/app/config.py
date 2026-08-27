from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str

    supabase_url: str
    supabase_service_key: str
    supabase_bucket: str = "audio-notes"

    gnani_api_key: str
    gnani_base_url: str = "https://api.vachana.ai"
    gnani_language_code: str = "en-IN"
    gnani_model: str = "gnani-prisma-v2.5"

    groq_api_key: str
    summarizer_model: str = "openai/gpt-oss-120b"

    cors_origins_raw: str = "http://localhost:5173"

    max_upload_bytes: int = 10 * 1024 * 1024
    job_poll_interval_seconds: int = 10
    job_timeout_seconds: int = 900
    stale_job_threshold_minutes: int = 15

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
