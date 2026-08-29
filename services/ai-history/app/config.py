"""Configuration settings for AI History Service."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# services/ai-history/.env — resolved from this file so the service picks up its
# own settings no matter which directory uvicorn was launched from.
_SERVICE_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    environment: str = "development"
    api_base_url: str = "http://localhost:4000"

    # --- ASR ---
    sarvam_api_key: str = ""
    sarvam_base_url: str = "https://api.sarvam.ai"
    sarvam_stt_model: str = "saaras:v3"
    sarvam_stt_mode: str = "transcribe"
    # Longest single utterance we accept. Requests above this are rejected with
    # 413 rather than forwarded, since providers charge per second of audio.
    max_utterance_seconds: float = 30.0
    # Below this score the kiosk should ask the patient to confirm or re-record.
    asr_min_confidence: float = 0.55

    # --- TTS ---
    sarvam_tts_model: str = "bulbul:v3"
    sarvam_tts_speaker: str = "shubh"
    sarvam_tts_sample_rate: int = 22050
    sarvam_tts_codec: str = "wav"

    # --- LLM primary (Groq) ---
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "openai/gpt-oss-20b"
    whisper_model: str = "whisper-large-v3"

    # --- LLM fallback (Gemini) ---
    google_gemini_api_key: str = ""
    gemini_fallback_model: str = "gemini-2.0-flash"

    # --- provider routing ---
    asr_primary: str = "sarvam"
    asr_fallback: str = "whisper"
    llm_primary: str = "groq"
    llm_fallback: str = "gemini"

    # --- dev-only glue ---
    dev_allow_kiosk_cors: bool = False
    kiosk_url: str = "http://localhost:3000"

    # Langfuse (AI observability)
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    model_config = SettingsConfigDict(
        env_file=(_SERVICE_ROOT / ".env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        # The repo root .env is shared with the Express API and the kiosk; ignore
        # keys this service does not declare instead of failing to boot.
        extra="ignore",
    )


settings = Settings()
