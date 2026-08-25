"""Configuration for AI Documents Service."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    api_base_url: str = "http://localhost:4000"
    google_gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
