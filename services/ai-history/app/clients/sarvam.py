"""Sarvam AI client for ASR (Saaras) and TTS (Bulbul)."""
import base64
import logging
import re

import httpx

from app.config import settings
from app.media import normalize_audio_format

logger = logging.getLogger(__name__)

# bulbul:v3 accepts 2500 chars per request; v2 accepts 1500.
_TTS_CHAR_LIMIT = {"bulbul:v3": 2500, "bulbul:v2": 1500}
_TTS_DEFAULT_LIMIT = 1500


def tts_char_limit() -> int:
    """Per-request character cap for the configured Bulbul model."""
    return _TTS_CHAR_LIMIT.get(settings.sarvam_tts_model, _TTS_DEFAULT_LIMIT)


def chunk_for_tts(text: str, limit: int | None = None) -> list[str]:
    """Split ``text`` into <=``limit``-char pieces on sentence boundaries.

    WHY: questions are short, but reading a generated narrative back to the
    patient can exceed Bulbul's per-request cap. Truncating would silently drop
    clinical content, so we split and let the caller concatenate the audio.
    Splits on sentence enders (including Devanagari danda) and only falls back
    to a hard character cut for a single oversized sentence.
    """
    limit = limit or tts_char_limit()
    text = text.strip()
    if len(text) <= limit:
        return [text] if text else []

    sentences = [s for s in re.split(r"(?<=[.!?।॥])\s+", text) if s]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        while len(sentence) > limit:  # single sentence longer than the cap
            if current:
                chunks.append(current)
                current = ""
            chunks.append(sentence[:limit])
            sentence = sentence[limit:]
        if not current:
            current = sentence
        elif len(current) + 1 + len(sentence) <= limit:
            current = f"{current} {sentence}"
        else:
            chunks.append(current)
            current = sentence
    if current:
        chunks.append(current)
    return chunks


class SarvamASRClient:
    @staticmethod
    async def transcribe(audio: bytes, mime: str, language_code: str, mode: str) -> dict:
        """POST /speech-to-text. Returns ``{transcript, language, confidence, raw}``."""
        url = f"{settings.sarvam_base_url}/speech-to-text"
        headers = {"api-subscription-key": settings.sarvam_api_key}

        # Sarvam rejects codec parameters (`audio/webm;codecs=opus` -> HTTP 400),
        # so send a bare mime and a clean filename extension.
        safe_mime, filename = normalize_audio_format(mime)
        files = {"file": (filename, audio, safe_mime)}
        data = {
            "model": settings.sarvam_stt_model,
            "mode": mode,
            "language_code": language_code,
            "with_timestamps": "false",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url, headers=headers, files=files, data=data, timeout=30.0
                )
                response.raise_for_status()
                res_data = response.json()

                transcript = (res_data.get("transcript") or "").strip()
                # Sarvam echoes the detected tag; may be absent or null when
                # language_code="unknown" fails to detect.
                lang = res_data.get("language_code") or language_code

                # Sarvam STT returns no numeric confidence, so apply the
                # Section H policy: a fixed score on non-empty success.
                confidence = res_data.get("confidence")
                if confidence is None:
                    confidence = 0.85 if transcript else 0.0

                return {
                    "transcript": transcript,
                    "language": lang,
                    "confidence": float(confidence),
                    "raw": res_data,
                }
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Sarvam ASR HTTP %s: %s", e.response.status_code, e.response.text[:400]
                )
                raise
            except Exception as e:
                logger.error("Sarvam ASR error: %s", e)
                raise


class SarvamTTSClient:
    @staticmethod
    async def synthesize(text: str, language_code: str, speaker: str, pace: float) -> bytes:
        """POST /text-to-speech for a single chunk. Returns decoded audio bytes."""
        url = f"{settings.sarvam_base_url}/text-to-speech"
        headers = {
            "api-subscription-key": settings.sarvam_api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "language_code": language_code,
            "speaker": speaker,
            "pace": pace,
            "speech_sample_rate": settings.sarvam_tts_sample_rate,
            "model": settings.sarvam_tts_model,
            "output_audio_codec": settings.sarvam_tts_codec,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                res_data = response.json()

                audios = res_data.get("audios") or []
                if not audios:
                    raise ValueError("No audio returned from Sarvam TTS")
                return base64.b64decode(audios[0])
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Sarvam TTS HTTP %s: %s", e.response.status_code, e.response.text[:400]
                )
                raise
            except Exception as e:
                logger.error("Sarvam TTS error: %s", e)
                raise
