"""
MediKiosk AI Documents Service
================================
Document AI service for OCR, clinical entity extraction, and timeline generation.
Handles: image preprocessing, OCR (Tesseract + Gemini Vision), entity extraction,
         medication/investigation parsing, medical timeline building.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.routers import documents
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("📄 MediKiosk AI Documents Service starting...")
    logger.info(f"   Environment : {settings.environment}")
    logger.info(f"   OCR Engine  : Tesseract + Gemini Vision")
    yield
    logger.info("AI Documents Service shutting down...")


app = FastAPI(
    title="MediKiosk AI Documents Service",
    description=(
        "Medical document OCR and clinical entity extraction.\n\n"
        "Handles image preprocessing, OCR (Tesseract + Gemini Vision), "
        "clinical entity extraction (medications, investigations, allergies, diagnoses), "
        "and medical timeline generation.\n\n"
        "> **All extracted information is for physician review only.**"
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.api_base_url],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/documents", tags=["documents"])


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "medikiosk-ai-documents",
        "version": "0.1.0",
    }
