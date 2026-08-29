"""ASR router — Sarvam Saaras primary, Groq Whisper fallback (Section H)."""
import base64
import binascii
import logging
import time

from fastapi import APIRouter, HTTPException

from app.clients.sarvam import SarvamASRClient
from app.clients.whisper import WhisperASRClient
from app.config import settings
from app.media import (
    normalize_audio_format,
    resolve_language,
    to_bcp47,
    to_iso639,
    wav_duration_seconds,
)
from app.models.schemas import ASRTranscribeRequest, ASRTranscribeResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _measured_duration(audio: bytes, request: ASRTranscribeRequest) -> float | None:
    """Best available duration: exact for WAV, else the client's own measurement."""
    if request.format == "wav":
        parsed = wav_duration_seconds(audio)
        if parsed is not None:
            return parsed
    return request.duration_seconds


@router.post("/transcribe", response_model=ASRTranscribeResponse)
async def transcribe_audio(request: ASRTranscribeRequest) -> ASRTranscribeResponse:
    start_ms = int(time.time() * 1000)

    try:
        audio_bytes = base64.b64decode(request.audio_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        logger.warning("ASR rejected malformed base64 payload: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid base64 audio") from exc

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio payload")

    duration = _measured_duration(audio_bytes, request)
    if duration is not None and duration > settings.max_utterance_seconds:
        # Reject long clips instead of paying for them. 413 (not 400) so the
        # kiosk can distinguish "too long, split it" from "malformed".
        raise HTTPException(
            status_code=413,
            detail=(
                f"Audio is {duration:.1f}s; the maximum single utterance is "
                f"{settings.max_utterance_seconds:.0f}s."
            ),
        )

    requested = request.language.value
    # `to_bcp47` is idempotent, so a client that already sends "hi-IN" does not
    # end up requesting "hi-IN-IN" (which Sarvam rejects with HTTP 400).
    sarvam_lang = to_bcp47(requested)
    whisper_lang = to_iso639(requested)
    # Canonical mime with any `;codecs=...` parameter stripped — the raw browser
    # value `audio/webm;codecs=opus` is rejected by Sarvam with HTTP 400.
    mime_type, _ = normalize_audio_format(request.format)

    result: dict | None = None
    provider = ""
    degraded_reason: str | None = None

    sarvam_enabled = bool(settings.sarvam_api_key) and settings.asr_primary == "sarvam"
    whisper_enabled = bool(settings.groq_api_key) and settings.asr_fallback == "whisper"

    if sarvam_enabled:
        try:
            result = await SarvamASRClient.transcribe(
                audio=audio_bytes,
                mime=mime_type,
                language_code=sarvam_lang,
                mode=settings.sarvam_stt_mode,
            )
            provider = "sarvam"
            if not result["transcript"]:
                # A 200 with an empty transcript is a soft failure: Saaras
                # sometimes returns nothing for short or noisy clips where
                # Whisper still succeeds. Treat it as a fallback trigger.
                degraded_reason = "sarvam returned an empty transcript"
                result, provider = None, ""
        except Exception as exc:
            degraded_reason = f"sarvam failed: {exc}"
            result, provider = None, ""

    if result is None and whisper_enabled:
        if degraded_reason:
            logger.warning("ASR falling back to Whisper — %s", degraded_reason)
        try:
            result = await WhisperASRClient.transcribe(
                audio=audio_bytes, mime=mime_type, language=whisper_lang
            )
            provider = "whisper"
        except Exception as exc:
            logger.error("Whisper ASR failed: %s", exc)
            if sarvam_enabled:
                raise HTTPException(
                    status_code=503, detail="All ASR providers failed"
                ) from exc
            raise HTTPException(status_code=503, detail=f"ASR failed: {exc}") from exc

    if result is None:
        if not sarvam_enabled and not whisper_enabled:
            raise HTTPException(status_code=503, detail="No ASR providers configured")
        # Sarvam is the only configured provider and it produced nothing usable.
        raise HTTPException(
            status_code=503, detail=degraded_reason or "ASR produced no transcript"
        )

    if degraded_reason and provider == "whisper":
        logger.info("ASR degraded to whisper for this request")

    return ASRTranscribeResponse(
        transcript=result["transcript"],
        # Providers report this inconsistently ("hi-IN" from Sarvam, "Hindi"
        # from Whisper); resolve to a supported code and never guess blindly.
        language=resolve_language(result.get("language"), requested),
        confidence=result["confidence"],
        duration_seconds=result.get("duration_seconds") or duration,
        processing_duration_ms=int(time.time() * 1000) - start_ms,
        provider_used=provider,
    )
