"""
History processing router.
Handles final evaluation of a section: LLM Extraction + Deterministic Red Flags.
"""
import logging
import time
from typing import List

from fastapi import APIRouter

from app.clients.llm import LLMError
from app.models.schemas import (
    ExtractionResult,
    ProcessHistoryRequest,
    ProcessHistoryResponse,
    RedFlag,
    RiskLevel,
    highest_risk,
)
from app.pipelines.extraction import ExtractionPipeline
from app.rules.red_flags import RedFlagEngine, RedFlagResult

router = APIRouter()
logger = logging.getLogger(__name__)
red_flag_engine = RedFlagEngine()


def _symptom_phrases(extraction: ExtractionResult) -> List[str]:
    """Structured symptom strings to feed the red-flag matcher (Section L).

    WHY: the engine is substring-based, so "chest pain radiating to arm" matches
    trigger tokens that the patient's raw phrasing ("it goes down my arm") never
    would. Extraction supplies the clinical vocabulary; urgency stays 100%
    deterministic.

    Denied symptoms are deliberately excluded — feeding "shortness of breath"
    from a *negative* finding would fire POTENTIAL_ACS on a patient who
    explicitly denied it.
    """
    phrases: List[str] = []

    for symptom in extraction.symptoms:
        if not symptom.present:
            continue
        phrase = symptom.name
        if symptom.severity:
            phrase = f"{symptom.severity} {phrase}"
        phrases.append(phrase)

    hpi = extraction.hpi
    if hpi:
        if hpi.location and hpi.radiation:
            phrases.append(f"{hpi.location} pain radiating to {hpi.radiation}")
        elif hpi.radiation:
            phrases.append(f"pain radiating to {hpi.radiation}")
        if hpi.character and hpi.location:
            phrases.append(f"{hpi.character} {hpi.location} pain")
        if hpi.severity:
            phrases.append(f"pain {hpi.severity}")
        phrases.extend(hpi.associated_symptoms or [])

    # Deduplicate while preserving order: `associated_symptoms` usually repeats
    # entries already present in `symptoms`, and duplicates only bloat the text
    # the matcher scans.
    seen: set[str] = set()
    unique: List[str] = []
    for phrase in phrases:
        cleaned = phrase.strip()
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            unique.append(cleaned)
    return unique


def _to_red_flag(result: RedFlagResult) -> RedFlag:
    """Explicit dataclass -> Pydantic mapping (Section S item 8).

    The old code relied on field names happening to line up and on the severity
    string coercing into the enum by luck; an added engine field or a typo'd
    severity would have failed at response-serialisation time with a 500.
    """
    return RedFlag(
        type=result.type,
        description=result.description,
        severity=RiskLevel(result.severity),
        triggered_by=list(result.triggered_by),
        requires_immediate_attention=bool(result.requires_immediate_attention),
    )


def _mean(values: List[float]) -> float:
    return round(sum(values) / len(values), 4) if values else 0.0


def _section_confidence(
    extraction: ExtractionResult | None, request: ProcessHistoryRequest
) -> float:
    """How much to trust this section's structured data.

    Prefers the mean confidence of the entities actually extracted. With no
    entities (a legitimately empty section, e.g. "no allergies") it falls back to
    the mean ASR confidence of the answers, which is the only signal left. The
    old hardcoded 0.9 claimed high confidence even for a garbled transcript.
    """
    if extraction is None:
        return 0.0

    entity_scores = [
        *(m.confidence for m in extraction.medications),
        *(a.confidence for a in extraction.allergies),
        *(s.confidence for s in extraction.symptoms),
    ]
    if entity_scores:
        return _mean(entity_scores)

    asr_scores = [a.confidence for a in request.answers if a.confidence is not None]
    return _mean(asr_scores)


@router.post("/process", response_model=ProcessHistoryResponse)
async def process_history(request: ProcessHistoryRequest) -> ProcessHistoryResponse:
    start_ms = int(time.time() * 1000)

    answers_text = [a.raw_answer for a in request.answers if a.raw_answer]

    # 1. LLM extraction. A total failure is survivable: per Section J.3 we return
    #    a red-flags-only result rather than persisting invalid extraction.
    extraction: ExtractionResult | None = None
    model_used: str | None = None
    try:
        extraction, model_used = await ExtractionPipeline.extract_entities(
            answers=request.answers,
            section_type=request.section_type.value,
        )
    except LLMError as exc:
        logger.error(
            "Extraction unavailable for session=%s section=%s: %s",
            request.session_id,
            request.section_type.value,
            exc,
        )
    except Exception as exc:  # unexpected shape/bug — must not lose red flags
        logger.exception(
            "Unexpected extraction failure for session=%s section=%s: %s",
            request.session_id,
            request.section_type.value,
            exc,
        )

    # 2. Deterministic red flags over raw answers PLUS structured symptom strings.
    #    Evaluated once, after extraction, so each rule can fire at most once and
    #    the banner never shows duplicates.
    red_flag_inputs = list(answers_text)
    if extraction is not None:
        red_flag_inputs.extend(_symptom_phrases(extraction))

    flags = red_flag_engine.evaluate(
        answers=red_flag_inputs,
        section_type=request.section_type.value,
    )
    red_flags = [_to_red_flag(f) for f in flags]
    # `highest_risk` ranks by clinical severity; `max()` on these str-enum values
    # would compare alphabetically and rank WARNING above EMERGENCY.
    risk_level = highest_risk(f.severity for f in red_flags)

    if red_flags:
        logger.info(
            "Red flags for session=%s section=%s: %s (risk=%s)",
            request.session_id,
            request.section_type.value,
            [f.type for f in red_flags],
            risk_level.value,
        )

    return ProcessHistoryResponse(
        session_id=request.session_id,
        section_type=request.section_type,
        processed_answers=request.answers,
        extracted_medications=extraction.medications if extraction else [],
        extracted_allergies=extraction.allergies if extraction else [],
        extracted_symptoms=extraction.symptoms if extraction else [],
        hpi=extraction.hpi if extraction else None,
        red_flags=red_flags,
        risk_level=risk_level,
        narrative=extraction.narrative if extraction else None,
        processing_duration_ms=int(time.time() * 1000) - start_ms,
        model_used=model_used,
        confidence=_section_confidence(extraction, request),
    )
