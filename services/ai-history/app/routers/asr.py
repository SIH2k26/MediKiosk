"""ASR (Automatic Speech Recognition) router via Bhashini API."""
import time
from fastapi import APIRouter, HTTPException
from app.models.schemas import ASRTranscribeRequest, ASRTranscribeResponse
from app.config import settings
import httpx

router = APIRouter()


@router.post("/transcribe", response_model=ASRTranscribeResponse)
async def transcribe_audio(request: ASRTranscribeRequest) -> ASRTranscribeResponse:
    """
    Transcribe audio using Bhashini API.
    
    Supports: Hindi, English, Tamil, Telugu, Bengali, Marathi,
              Gujarati, Kannada, Malayalam, Punjabi.
    
    Phase 3: Full Bhashini API integration.
    Currently returns a placeholder response.
    """
    start_ms = int(time.time() * 1000)

    if not settings.bhashini_api_key:
        # Return mock response for development without credentials
        duration_ms = int(time.time() * 1000) - start_ms
        return ASRTranscribeResponse(
            transcript="[Mock transcript — configure BHASHINI_API_KEY]",
            language=request.language,
            confidence=0.0,
            processing_duration_ms=duration_ms,
        )

    # TODO Phase 3: Implement Bhashini API call
    # Reference: https://bhashini.gov.in/ulca/
    # Pipeline: ASR (Speech → Text) for Indian languages

    duration_ms = int(time.time() * 1000) - start_ms
    raise HTTPException(
        status_code=501,
        detail="Bhashini ASR integration — Phase 3",
    )
