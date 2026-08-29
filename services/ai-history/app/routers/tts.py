"""TTS router — Sarvam Bulbul, with the kiosk falling back to speechSynthesis."""
import asyncio
import base64
import logging

from fastapi import APIRouter, HTTPException

from app.clients.sarvam import SarvamTTSClient, chunk_for_tts, tts_char_limit
from app.config import settings
from app.media import concat_wav, to_bcp47
from app.models.schemas import TTSRequest, TTSResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(request: TTSRequest) -> TTSResponse:
    """Synthesize speech with Bulbul.

    On any provider failure this returns 502 with ``tts_unavailable`` so the
    kiosk can degrade to the browser's ``speechSynthesis`` (Section I).
    """
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty")

    if not settings.sarvam_api_key:
        # 503, not 502: nothing is wrong upstream, the deployment simply has no
        # key. The kiosk treats both as "use the browser voice".
        raise HTTPException(status_code=503, detail="tts_not_configured")

    # `to_bcp47` is idempotent: "hi" -> "hi-IN" and "hi-IN" -> "hi-IN". The old
    # f"{language}-IN" produced "hi-IN-IN" for clients that sent a full tag,
    # which Sarvam rejects.
    sarvam_lang = to_bcp47(request.language)
    if sarvam_lang == "unknown":
        raise HTTPException(status_code=400, detail="language is required for TTS")

    speaker = request.speaker or settings.sarvam_tts_speaker
    # Split on sentence boundaries rather than truncating — a truncated narrative
    # would silently drop clinical content the patient is meant to hear.
    chunks = chunk_for_tts(text, tts_char_limit())

    try:
        parts = await asyncio.gather(
            *(
                SarvamTTSClient.synthesize(
                    text=chunk,
                    language_code=sarvam_lang,
                    speaker=speaker,
                    pace=request.pace,
                )
                for chunk in chunks
            )
        )
    except Exception as exc:
        logger.error("TTS synthesis failed (%d chunk(s)): %s", len(chunks), exc)
        raise HTTPException(status_code=502, detail="tts_unavailable") from exc

    audio_bytes = (
        concat_wav(list(parts)) if settings.sarvam_tts_codec == "wav" else b"".join(parts)
    )
    if not audio_bytes:
        logger.error("TTS returned no audio for %d chunk(s)", len(chunks))
        raise HTTPException(status_code=502, detail="tts_unavailable")

    if len(chunks) > 1:
        logger.info("TTS joined %d chunks into %d bytes", len(chunks), len(audio_bytes))

    return TTSResponse(
        audio_base64=base64.b64encode(audio_bytes).decode("utf-8"),
        format=settings.sarvam_tts_codec,
        sample_rate=settings.sarvam_tts_sample_rate,
        provider_used="sarvam",
    )
