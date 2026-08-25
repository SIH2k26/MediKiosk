"""Configuration settings for AI History Service."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    api_base_url: str = "http://localhost:4000"

    # Google Gemini
    google_gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_fallback_model: str = "gemini-1.5-pro"

    # Bhashini ASR
    bhashini_api_key: str = ""
    bhashini_user_id: str = ""
    bhashini_pipeline_id: str = ""
    bhashini_base_url: str = "https://dhruva-api.bhashini.gov.in"

    # Langfuse (AI observability)
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
