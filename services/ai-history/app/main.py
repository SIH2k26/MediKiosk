"""
MediKiosk AI History Service
==============================
Conversational AI service for clinical history taking.
Handles: ASR (Sarvam/Groq), dialogue management, clinical entity extraction,
         adaptive questioning, red-flag detection.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.clients import llm
from app.routers import history, asr, tts, dialogue
from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def _provider_status() -> dict[str, bool]:
    """Which providers hold a key. Booleans only — never the key material."""
    return {
        "sarvam": bool(settings.sarvam_api_key),
        "groq": bool(settings.groq_api_key),
        "gemini": bool(settings.google_gemini_api_key),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🧠 MediKiosk AI History Service starting...")
    logger.info(f"   Environment : {settings.environment}")
    logger.info(f"   LLM Primary : {settings.groq_model} | Fallback: {settings.gemini_fallback_model}")
    logger.info(f"   ASR Primary : Sarvam ({settings.sarvam_stt_model}) | Fallback: Groq Whisper")
    logger.info(f"   TTS         : Sarvam ({settings.sarvam_tts_model})")

    # Say plainly which providers are usable, so a demo that silently runs
    # entirely on fallbacks is obvious from the first lines of the log.
    for name, configured in _provider_status().items():
        if not configured:
            logger.warning("   %s API key is NOT set — that provider will be skipped.", name)

    yield

    await llm.aclose()
    logger.info("AI History Service shutting down...")


app = FastAPI(
    title="MediKiosk AI History Service",
    description=(
        "Conversational clinical history-taking engine.\n\n"
        "Handles voice transcription (ASR), TTS, "
        "clinical entity extraction, adaptive questioning, "
        "and red-flag detection.\n\n"
        "> **This service generates clinical information for physician review only.**"
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
allow_origins = [settings.api_base_url]
if settings.dev_allow_kiosk_cors:
    allow_origins.append(settings.kiosk_url)
    logger.warning(f"⚠️ DEV_ALLOW_KIOSK_CORS is TRUE. Allowing cross-origin requests from {settings.kiosk_url}.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(history.router, prefix="/history", tags=["history"])
app.include_router(asr.router, prefix="/asr", tags=["asr"])
app.include_router(tts.router, prefix="/tts", tags=["tts"])
app.include_router(dialogue.router, prefix="/dialogue", tags=["dialogue"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "medikiosk-ai-history",
        "version": "0.1.0",
        # Booleans, not keys. Lets the smoke scripts assert which providers a
        # given run actually exercised instead of guessing from the transcript.
        "providers": _provider_status(),
        "models": {
            "asr": settings.sarvam_stt_model,
            "asr_fallback": settings.whisper_model,
            "tts": settings.sarvam_tts_model,
            "llm": settings.groq_model,
            "llm_fallback": settings.gemini_fallback_model,
        },
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
