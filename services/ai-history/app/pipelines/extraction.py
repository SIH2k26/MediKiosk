"""Clinical entity extraction pipeline via LLM."""
from typing import List

from app.clients.llm import LLMClient
from app.models.schemas import ExtractionResult, HistoryAnswerInput

SYSTEM_PROMPT = """
You are a senior clinical AI assistant. Your task is to extract structured clinical entities 
from the patient's answers during a medical interview.
Extract medications, allergies, symptoms, and a structured HPI (History of Present Illness).
Write a short, professional medical narrative summary of the complaint and history.

You must ALWAYS output valid JSON matching the requested schema exactly.
If information is missing, use null or empty lists, do NOT invent facts.
"""

# JSON schema for Groq structured output (strict mode)
EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "medications": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "dose": {"type": ["string", "null"]},
                    "frequency": {"type": ["string", "null"]},
                    "is_currently_taking": {"type": "boolean"},
                    "confidence": {"type": "number"}
                },
                "required": ["name", "dose", "frequency", "is_currently_taking", "confidence"],
                "additionalProperties": False
            }
        },
        "allergies": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "substance": {"type": "string"},
                    "reaction": {"type": ["string", "null"]},
                    "severity": {"type": ["string", "null"]},
                    "confidence": {"type": "number"}
                },
                "required": ["substance", "reaction", "severity", "confidence"],
                "additionalProperties": False
            }
        },
        "symptoms": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "present": {"type": "boolean"},
                    "onset": {"type": ["string", "null"]},
                    "duration": {"type": ["string", "null"]},
                    "severity": {"type": ["string", "null"]},
                    "confidence": {"type": "number"}
                },
                "required": ["name", "present", "onset", "duration", "severity", "confidence"],
                "additionalProperties": False
            }
        },
        "hpi": {
            "type": ["object", "null"],
            "properties": {
                "onset": {"type": ["string", "null"]},
                "duration": {"type": ["string", "null"]},
                "character": {"type": ["string", "null"]},
                "location": {"type": ["string", "null"]},
                "radiation": {"type": ["string", "null"]},
                "severity": {"type": ["string", "null"]},
                "aggravating": {"type": ["array", "null"], "items": {"type": "string"}},
                "relieving": {"type": ["array", "null"], "items": {"type": "string"}},
                "associated_symptoms": {"type": ["array", "null"], "items": {"type": "string"}}
            },
            "required": ["onset", "duration", "character", "location", "radiation", "severity", "aggravating", "relieving", "associated_symptoms"],
            "additionalProperties": False
        },
        "narrative": {"type": "string"}
    },
    "required": ["medications", "allergies", "symptoms", "hpi", "narrative"],
    "additionalProperties": False
}

class ExtractionPipeline:
    @staticmethod
    async def extract_entities(
        answers: List[HistoryAnswerInput], section_type: str
    ) -> tuple[ExtractionResult, str]:
        """Extract clinical entities from a section's answers.

        Returns ``(validated_result, model_used)``. Raises ``LLMError`` if no
        provider produced schema-valid output.
        """
        lines = [f"Section: {section_type}", "", "Patient Answers:"]
        for ans in answers:
            lines.append(f"- Q: {ans.question_text}")
            lines.append(f"  A: {ans.raw_answer}")
        user_prompt = "\n".join(lines)

        payload, model_used = await LLMClient.complete_json(
            system=SYSTEM_PROMPT,
            user=user_prompt,
            schema=EXTRACTION_SCHEMA,
            schema_name="ClinicalExtraction",
            # Validation is part of the LLM contract, not an afterthought: a
            # failure here retries and then falls back to the other provider.
            validator=ExtractionResult.model_validate,
        )
        return ExtractionResult.model_validate(payload), model_used
