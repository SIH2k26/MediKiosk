"""Clinical entity extraction from OCR text."""
from typing import List
from app.models.schemas import ExtractedEntity, ExtractedMedication, ExtractedInvestigation, ExtractedAllergy


class EntityExtractor:
    """
    Extracts clinical entities from OCR'd text.
    
    Phase 4: Full implementation with Gemini + structured output.
    Uses schema-validated extraction — never raw LLM text.
    """

    def extract(self, text: str, language: str = "hi"):
        """Extract all clinical entities from OCR text."""
        # TODO Phase 4: Implement with Gemini structured extraction
        return {
            "entities": [],
            "medications": [],
            "investigations": [],
            "allergies": [],
        }
