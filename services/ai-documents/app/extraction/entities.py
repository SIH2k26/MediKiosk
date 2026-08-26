"""Clinical entity extraction from OCR text."""
import json
import logging

import google.generativeai as genai

from app.config import settings
from app.models.schemas import (
    ExtractedEntity,
    ExtractedMedication,
    ExtractedInvestigation,
    ExtractedAllergy,
    EntityType,
)

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.google_gemini_api_key)

EXTRACTION_PROMPT = """You are a clinical data extraction system. Extract structured medical
information from the OCR'd text below. The text may contain OCR errors — use clinical
context to correct obvious mistakes where confident.

Return ONLY valid JSON matching this exact structure, nothing else:

{{
  "entities": [
    {{"entity_type": "DIAGNOSIS|SURGERY|DATE|DOCTOR|HOSPITAL|OTHER", "value": "raw text as seen", "normalized_value": "cleaned/standard form or null", "confidence": 0.0-1.0}}
  ],
  "medications": [
    {{"name": "medication name", "generic_name": "generic name or null", "dose": "e.g. 500mg or null", "frequency": "e.g. twice daily or null", "route": "oral/IV/etc or null", "is_currently_taking": true, "confidence": 0.0-1.0}}
  ],
  "investigations": [
    {{"name": "test name", "value": "result value or null", "unit": "unit or null", "reference_range": "e.g. 70-100 or null", "test_date": "YYYY-MM-DD or null", "confidence": 0.0-1.0}}
  ],
  "allergies": [
    {{"substance": "allergen name", "reaction": "reaction description or null", "severity": "mild/moderate/severe or null", "confidence": 0.0-1.0}}
  ]
}}

Rules:
- Only extract what's actually present in the text — do not invent data.
- confidence should reflect how certain you are given OCR noise (lower if text is garbled).
- If a category has nothing, return an empty list for it.
- Do not include medications, investigations, or allergies in the "entities" list — those go in their own dedicated lists only. "entities" is for diagnoses, surgeries, dates, doctors, hospitals, and anything else.
- Language of source document: {language}

Text to extract from:
---
{text}
---
"""


class EntityExtractor:
    """
    Extracts clinical entities from OCR'd text.

    Uses Gemini with a strict JSON prompt, then validates every item through
    the Pydantic schemas — malformed or hallucinated fields get dropped rather
    than silently passed through.
    """

    def __init__(self, model_name: str | None = None):
        self.model = genai.GenerativeModel(model_name or settings.gemini_model)

    def extract(self, text: str, language: str = "hi") -> dict:
        """Extract all clinical entities from OCR text."""
        if not text or not text.strip():
            return {"entities": [], "medications": [], "investigations": [], "allergies": []}

        prompt = EXTRACTION_PROMPT.format(language=language, text=text)

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            print("RAW GEMINI RESPONSE:", response.text)
            raw = json.loads(response.text)
        except Exception as e:
            print("GEMINI ERROR:", e)
            logger.error(f"Gemini extraction failed: {e}")
            return {"entities": [], "medications": [], "investigations": [], "allergies": []}

        return {
            "entities": self._safe_parse_list(raw.get("entities", []), ExtractedEntity),
            "medications": self._safe_parse_list(raw.get("medications", []), ExtractedMedication),
            "investigations": self._safe_parse_list(raw.get("investigations", []), ExtractedInvestigation),
            "allergies": self._safe_parse_list(raw.get("allergies", []), ExtractedAllergy),
        }

    def _safe_parse_list(self, items: list, model_cls) -> list:
        """Validate each item against its Pydantic model; skip and log any that fail."""
        parsed = []
        for item in items:
            try:
                parsed.append(model_cls(**item))
            except Exception as e:
                logger.warning(f"Skipping malformed {model_cls.__name__}: {item} ({e})")
        return parsed