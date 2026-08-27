"""
OCR Pipeline — Sarvam AI Document Intelligence (Digitise) for text extraction.
Replaces the earlier Tesseract-based pipeline: Sarvam is purpose-built for
Indian languages and performs significantly better on handwritten / messy
printed medical documents, especially Hindi and other Indic scripts.
"""
import io
import time
import zipfile
from dataclasses import dataclass

import httpx
from sarvamai import SarvamAI
from sarvamai.core.api_error import ApiError

from app.config import settings

# Map our internal language codes to Sarvam's language codes (needs -IN suffix)
SARVAM_LANG_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "bn": "bn-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "pa": "pa-IN",
}

MIME_TO_FILENAME = {
    "application/pdf": ("document.pdf", "application/pdf"),
    "image/jpeg": ("document.jpg", "image/jpeg"),
    "image/png": ("document.png", "image/png"),
    "image/webp": ("document.webp", "image/webp"),
}

TERMINAL_STATES = {"completed", "partially_completed", "failed", "rejected"}
POLL_INTERVAL_SECONDS = 3
POLL_TIMEOUT_SECONDS = 120


@dataclass
class OCRResult:
    text: str
    confidence: float
    page_count: int
    page_texts: list[str]  # per-page text, needed for source traceability (feature 25)


class OCRPipeline:
    """
    Runs documents through Sarvam AI's Digitise API for OCR.

    NOTE on page_texts: Sarvam's Digitise returns one combined markdown file
    per job. For single-page documents (the common case for prescriptions)
    this is exactly right — page_texts=[full_text]. For multi-page PDFs,
    we currently treat the whole document as one "page" of text for
    downstream processing; splitting truly per-page would require parsing
    the per-page metadata JSON files in the output zip, which needs
    verifying against real multi-page output before relying on it.
    """

    def __init__(self):
        self.client = SarvamAI(api_subscription_key=settings.sarvam_api_key)

    def process(self, image_bytes: bytes, mime_type: str, language: str = "hi") -> OCRResult:
        sarvam_lang = SARVAM_LANG_MAP.get(language, "en-IN")
        filename, content_type = MIME_TO_FILENAME.get(mime_type, ("document.jpg", "image/jpeg"))

        try:
            job = self.client.doc_ai.digitise(
                file=[(filename, io.BytesIO(image_bytes), content_type)],
                language=sarvam_lang,
                output_format="md",
            )
        except ApiError as e:
            raise RuntimeError(f"Sarvam digitise job failed to start: {e.status_code} {e.body}")

        status = self._poll_until_terminal(job.job_id)

        if status.status.lower() == "rejected":
            raise RuntimeError(f"Sarvam job rejected: {status}")
        if status.status.lower() == "failed":
            raise RuntimeError(f"Sarvam job failed: {status}")

        text = self._download_and_extract_text(job.job_id)

        pages_total = status.usage.pages_total or 1
        pages_succeeded = status.usage.pages_succeeded or 0
        # Proxy for confidence: Sarvam doesn't return a numeric OCR confidence,
        # so we approximate using the ratio of successfully processed pages.
        confidence = round(pages_succeeded / pages_total, 3) if pages_total else 0.0

        return OCRResult(
            text=text,
            confidence=confidence,
            page_count=pages_total,
            page_texts=[text],  # see NOTE above re: multi-page splitting
        )

    def _poll_until_terminal(self, job_id: str):
        start = time.time()
        while True:
            status = self.client.doc_ai.get_status(job_id=job_id)
            if status.status.lower() in TERMINAL_STATES:
                return status
            if time.time() - start > POLL_TIMEOUT_SECONDS:
                raise TimeoutError(f"Sarvam job {job_id} did not finish within {POLL_TIMEOUT_SECONDS}s")
            time.sleep(POLL_INTERVAL_SECONDS)

    def _download_and_extract_text(self, job_id: str) -> str:
        download = self.client.doc_ai.get_download_url(job_id=job_id)
        response = httpx.get(download.url, timeout=30.0)
        response.raise_for_status()

        with zipfile.ZipFile(io.BytesIO(response.content)) as z:
            md_files = [n for n in z.namelist() if n.endswith(".md")]
            if not md_files:
                raise RuntimeError(f"No .md output found in Sarvam result zip: {z.namelist()}")
            with z.open(md_files[0]) as f:
                return f.read().decode("utf-8")