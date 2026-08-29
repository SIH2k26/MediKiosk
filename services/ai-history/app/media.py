"""
Audio + language normalisation helpers shared by the ASR/TTS clients.

WHY this module exists
----------------------
Sarvam validates the multipart ``Content-Type`` strictly. Sending the browser's
full codec string (``audio/webm;codecs=opus``) is rejected with::

    HTTP 400 {"error":{"message":"Invalid file type: audio/webm;codecs=opus. Only
    [... 'audio/webm', 'video/webm'] are allowed."}}

Verified against the live API on 2026-08-28. The codec parameter must be
stripped before the request is sent, and the upload filename must carry a clean
extension (``audio.webm``, never ``audio.webm;codecs=opus``).
"""
from __future__ import annotations

import struct

# MIME types Sarvam /speech-to-text accepts (from the live 400 error payload).
SARVAM_ALLOWED_MIMES = frozenset({
    "audio/mpeg", "audio/mp3", "audio/mpeg3", "audio/x-mpeg-3", "audio/x-mp3",
    "audio/wav", "audio/x-wav", "audio/wave",
    "audio/pcm_s16le", "audio/l16", "audio/raw", "application/octet-stream",
    "audio/aac", "audio/x-aac", "audio/aiff", "audio/x-aiff",
    "audio/ogg", "audio/opus", "audio/flac", "audio/x-flac",
    "audio/mp4", "audio/x-m4a", "audio/amr", "audio/x-ms-wma",
    "audio/webm", "video/webm",
})

# Our wire ``format`` values -> (canonical mime, file extension).
_FORMAT_MAP: dict[str, tuple[str, str]] = {
    "webm": ("audio/webm", "webm"),
    "ogg": ("audio/ogg", "ogg"),
    "opus": ("audio/ogg", "ogg"),
    "wav": ("audio/wav", "wav"),
    "mp3": ("audio/mpeg", "mp3"),
    "mp4": ("audio/mp4", "mp4"),
    "m4a": ("audio/mp4", "m4a"),
    "flac": ("audio/flac", "flac"),
}

# Enum language code -> Sarvam BCP-47 tag.
_BCP47_MAP: dict[str, str] = {
    "hi": "hi-IN", "en": "en-IN", "ta": "ta-IN", "te": "te-IN", "bn": "bn-IN",
    "mr": "mr-IN", "gu": "gu-IN", "kn": "kn-IN", "ml": "ml-IN", "pa": "pa-IN",
}

SUPPORTED_LANGUAGES = frozenset(_BCP47_MAP)

# Whisper's verbose_json reports a capitalised English language NAME ("Hindi"),
# not a code — verified against Groq on 2026-08-28. Truncating that name to two
# characters yields invalid codes ("Bengali" -> "be", "Punjabi" -> "pu"), so map
# names explicitly instead.
_LANGUAGE_NAME_MAP: dict[str, str] = {
    "hindi": "hi", "english": "en", "tamil": "ta", "telugu": "te",
    "bengali": "bn", "bangla": "bn", "marathi": "mr", "gujarati": "gu",
    "kannada": "kn", "malayalam": "ml", "punjabi": "pa", "panjabi": "pa",
}


def normalize_audio_format(fmt: str) -> tuple[str, str]:
    """Map a wire ``format`` value to a Sarvam-safe ``(mime, filename)`` pair.

    Any codec parameter (``;codecs=opus``) is dropped — see module docstring.
    Unknown formats degrade to ``application/octet-stream``, which Sarvam
    accepts and sniffs, rather than failing the request outright.
    """
    base = (fmt or "").split(";")[0].strip().lower()
    base = base.removeprefix("audio/").removeprefix("video/")

    mime, ext = _FORMAT_MAP.get(base, ("application/octet-stream", "bin"))
    if mime not in SARVAM_ALLOWED_MIMES:  # defensive; map is curated above
        mime = "application/octet-stream"
    return mime, f"audio.{ext}"


def to_bcp47(language: str | None) -> str:
    """Enum code (``hi``) or passthrough tag (``hi-IN``) -> Sarvam BCP-47 tag.

    Idempotent: ``hi-IN`` stays ``hi-IN`` instead of becoming ``hi-IN-IN``,
    which Sarvam rejects with HTTP 400.
    """
    if not language:
        return "unknown"
    tag = language.strip()
    if tag.lower() in ("unknown", "auto"):
        return "unknown"
    if "-" in tag:  # already a BCP-47 tag
        return tag
    return _BCP47_MAP.get(tag.lower(), f"{tag.lower()}-IN")


def to_iso639(language: str | None) -> str | None:
    """BCP-47 tag or enum code -> ISO-639-1 primary subtag (Whisper's ``language``)."""
    if not language:
        return None
    primary = language.strip().split("-")[0].lower()
    if primary in ("unknown", "auto", ""):
        return None
    return primary


def resolve_language(detected: str | None, requested: str) -> str:
    """Coerce a provider's language field into a supported ``Language`` code.

    Providers disagree on the shape of this field: Sarvam echoes a BCP-47 tag
    (``hi-IN``), Whisper reports a capitalised English name (``Hindi``). Neither
    is a valid ``Language`` enum member, and naively slicing the first two
    characters produces invalid codes for several Indian languages
    (``Bengali`` -> ``be``, ``Punjabi`` -> ``pu``, ``Kannada`` -> ``ka``), which
    fails response validation with a 500.

    Falls back to ``requested`` whenever the detected value is missing or not one
    of the ten languages we support — the patient's chosen language is a far
    better guess than an arbitrary default.
    """
    fallback = requested.strip().lower() if requested else "en"
    if fallback not in SUPPORTED_LANGUAGES:
        fallback = "en"
    if not detected:
        return fallback

    value = detected.strip().lower()
    if value in ("unknown", "auto", ""):
        return fallback
    if value in SUPPORTED_LANGUAGES:            # already "hi"
        return value
    if value in _LANGUAGE_NAME_MAP:             # Whisper's "hindi"
        return _LANGUAGE_NAME_MAP[value]

    primary = value.split("-")[0]               # Sarvam's "hi-IN"
    if primary in SUPPORTED_LANGUAGES:
        return primary
    return _LANGUAGE_NAME_MAP.get(primary, fallback)


def _wav_parts(audio: bytes) -> tuple[bytes, bytes] | None:
    """Split a RIFF/WAVE buffer into ``(fmt_chunk, data_payload)``.

    Returns ``None`` for anything that is not parseable WAV. The ``fmt_chunk``
    includes its 8-byte header so it can be written back verbatim.
    """
    if len(audio) < 44 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        return None
    try:
        pos = 12
        fmt_chunk = b""
        while pos + 8 <= len(audio):
            chunk_id = audio[pos:pos + 4]
            (chunk_size,) = struct.unpack("<I", audio[pos + 4:pos + 8])
            body = pos + 8
            if chunk_id == b"fmt ":
                fmt_chunk = audio[pos:body + chunk_size]
            elif chunk_id == b"data":
                end = min(body + chunk_size, len(audio))
                return fmt_chunk, audio[body:end]
            pos = body + chunk_size + (chunk_size & 1)  # chunks are word-aligned
    except struct.error:
        return None
    return None


def wav_duration_seconds(audio: bytes) -> float | None:
    """Duration of a RIFF/WAVE buffer, or ``None`` if it isn't parseable WAV.

    Only WAV is parsed: it is the one container whose header gives an exact
    duration without a media library. Compressed containers (WebM/Opus, MP4)
    would need a demuxer, which the MVP deliberately avoids — the kiosk reports
    its own recording length instead (see ``ASRTranscribeRequest.duration_seconds``).
    """
    parts = _wav_parts(audio)
    if parts is None:
        return None
    fmt_chunk, data = parts
    if len(fmt_chunk) < 20 or not data:
        return None
    try:
        # Byte rate lives at offset 8 within the fmt body (i.e. 16 into the chunk).
        (byte_rate,) = struct.unpack("<I", fmt_chunk[16:20])
    except struct.error:
        return None
    if not byte_rate:
        return None
    return round(len(data) / byte_rate, 2)


def concat_wav(parts: list[bytes]) -> bytes:
    """Join several WAV buffers into one playable WAV.

    WHY not ``b"".join(...)``: each Sarvam TTS chunk is a complete WAV file with
    its own RIFF header. Byte-concatenating them yields a stream whose declared
    length covers only the first chunk, so browsers play the first sentence and
    silently stop. Rebuilding a single header keeps long narratives audible.

    Chunks are assumed to share a sample format — they come from one TTS request
    with fixed model/sample-rate settings. Anything unparseable is returned as
    the first buffer alone rather than corrupting the output.
    """
    usable = [p for p in parts if p]
    if not usable:
        return b""
    if len(usable) == 1:
        return usable[0]

    parsed = [_wav_parts(p) for p in usable]
    if any(p is None for p in parsed) or not parsed[0][0]:
        return usable[0]

    fmt_chunk = parsed[0][0]
    payload = b"".join(data for _, data in parsed)  # type: ignore[misc]
    body = fmt_chunk + b"data" + struct.pack("<I", len(payload)) + payload
    return b"RIFF" + struct.pack("<I", 4 + len(body)) + b"WAVE" + body
