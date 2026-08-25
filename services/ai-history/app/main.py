"""
MediKiosk AI History Service
==============================
Conversational AI service for clinical history taking.
Handles: ASR (Bhashini), dialogue management, clinical entity extraction,
         adaptive questioning, red-flag detection.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.routers import history, asr
from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🧠 MediKiosk AI History Service starting...")
    logger.info(f"   Environment : {settings.environment}")
    logger.info(f"   LLM Model   : {settings.gemini_model}")
    logger.info(f"   ASR         : Bhashini API")
    yield
    logger.info("AI History Service shutting down...")


app = FastAPI(
    title="MediKiosk AI History Service",
    description=(
        "Conversational clinical history-taking engine.\n\n"
        "Handles voice transcription (ASR via Bhashini), "
        "clinical entity extraction, adaptive questioning, "
        "and red-flag detection.\n\n"
        "> **This service generates clinical information for physician review only.**"
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — only allow internal Express API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.api_base_url],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Include routers
app.include_router(history.router, prefix="/history", tags=["history"])
app.include_router(asr.router, prefix="/asr", tags=["asr"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "medikiosk-ai-history",
        "version": "0.1.0",
    }
