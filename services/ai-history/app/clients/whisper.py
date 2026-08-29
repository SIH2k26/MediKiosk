"""Groq-hosted Whisper client — ASR fallback."""
import logging
import math
from typing import Optional

from openai import AsyncOpenAI

from app.config import settings
from app.media import normalize_audio_format, to_iso639

logger = logging.getLogger(__name__)


def _derive_confidence(payload: dict) -> float:
    """Confidence proxy from a ``verbose_json`` transcription.

    WHY segments and not the top level: Whisper's ``verbose_json`` puts
    ``avg_logprob`` / ``no_speech_prob`` on each entry of ``segments[]``, never on
    the root object. Reading them off the root always yields ``None``, which
    silently pins confidence to the default forever.

    Per Section H we prefer ``exp(avg_logprob)`` and fall back to
    ``1 - no_speech_prob``, averaged across segments and clamped to [0, 1].
    """
    segments = payload.get("segments") or []
    scores: list[float] = []
    for seg in segments:
        if not isinstance(seg, dict):
            continue
        avg_logprob = seg.get("avg_logprob")
        no_speech = seg.get("no_speech_prob")
        if isinstance(avg_logprob, (int, float)):
            scores.append(math.exp(avg_logprob))
        elif isinstance(no_speech, (int, float)):
            scores.append(1.0 - no_speech)
    if not scores:
        return 0.85 if (payload.get("text") or "").strip() else 0.0
    return max(0.0, min(1.0, sum(scores) / len(scores)))


class WhisperASRClient:
    @staticmethod
    async def transcribe(audio: bytes, mime: str, language: Optional[str] = None) -> dict:
        """POST /audio/transcriptions. Returns ``{transcript, language, confidence, raw}``."""
        client = AsyncOpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)

        # Strip codec params from the mime and use a clean extension, same as
        # the Sarvam path — a bare `audio/webm` is what servers actually accept.
        safe_mime, filename = normalize_audio_format(mime)

        params: dict = {
            "file": (filename, audio, safe_mime),
            "model": settings.whisper_model,
            "response_format": "verbose_json",
            "temperature": 0.0,
        }
        iso_lang = to_iso639(language)
        if iso_lang:
            params["language"] = iso_lang

        try:
            transcription = await client.audio.transcriptions.create(**params)
            payload = (
                transcription.model_dump()
                if hasattr(transcription, "model_dump")
                else dict(transcription)
            )

            transcript = (payload.get("text") or "").strip()
            duration = payload.get("duration")
            return {
                "transcript": transcript,
                # Raw provider value ("Hindi") — the router resolves it to a
                # supported Language code via media.resolve_language.
                "language": payload.get("language") or iso_lang,
                "confidence": _derive_confidence(payload),
                "duration_seconds": (
                    round(float(duration), 2) if isinstance(duration, (int, float)) else None
                ),
                "raw": payload,
            }
        except Exception as e:
            logger.error("Whisper ASR error: %s", e)
            raise
        finally:
            await client.close()
