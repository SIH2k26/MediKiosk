"""
History processing router.
Phase 3 will implement the full conversational AI pipeline.
"""
import time
from fastapi import APIRouter, HTTPException
from app.models.schemas import ProcessHistoryRequest, ProcessHistoryResponse, RiskLevel
from app.pipelines.dialogue import DialogueManager
from app.rules.red_flags import RedFlagEngine

router = APIRouter()
dialogue_manager = DialogueManager()
red_flag_engine = RedFlagEngine()


@router.post("/process", response_model=ProcessHistoryResponse)
async def process_history(request: ProcessHistoryRequest) -> ProcessHistoryResponse:
    """
    Process clinical history answers.
    
    1. Runs answers through clinical entity extraction
    2. Evaluates red-flag rules (deterministic)
    3. Generates structured history section
    
    Phase 3: Full implementation with Gemini + Bhashini integration.
    """
    start_ms = int(time.time() * 1000)

    # TODO Phase 3: Implement full pipeline
    # - NLP entity extraction via Gemini
    # - Red flag evaluation via deterministic rules
    # - Adaptive follow-up question generation

    # Stub: evaluate red flags even on raw answers (deterministic rules only)
    red_flags = red_flag_engine.evaluate(
        answers=[a.raw_answer for a in request.answers],
        section_type=request.section_type.value,
    )

    risk_level = RiskLevel.NORMAL
    if red_flags:
        risk_level = max(
            (rf.severity for rf in red_flags),
            key=lambda r: ["NORMAL", "WARNING", "HIGH_PRIORITY", "EMERGENCY"].index(r)
        )

    duration_ms = int(time.time() * 1000) - start_ms

    return ProcessHistoryResponse(
        session_id=request.session_id,
        section_type=request.section_type,
        processed_answers=request.answers,
        red_flags=red_flags,
        risk_level=risk_level,
        narrative=None,  # Phase 3: Gemini-generated narrative
        processing_duration_ms=duration_ms,
        model_used=None,
        confidence=0.0,
    )
