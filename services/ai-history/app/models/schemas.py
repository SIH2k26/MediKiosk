"""Pydantic models for the AI History Service."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal, Any, Dict
from enum import Enum


def _coerce_confidence(value: Any) -> Any:
    """Normalise a model-supplied confidence into [0, 1].

    LLMs report confidence as a percentage often enough (``95``) that rejecting
    it would burn a retry on a response that is otherwise perfectly usable.
    Percentages are rescaled; anything else out of range is clamped.
    """
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return value
    number = float(value)
    if 1.0 < number <= 100.0:
        number /= 100.0
    return min(1.0, max(0.0, number))


class Language(str, Enum):
    ENGLISH = "en"
    HINDI = "hi"
    TAMIL = "ta"
    TELUGU = "te"
    BENGALI = "bn"
    MARATHI = "mr"
    GUJARATI = "gu"
    KANNADA = "kn"
    MALAYALAM = "ml"
    PUNJABI = "pa"


class AnswerType(str, Enum):
    VOICE = "VOICE"
    TOUCH = "TOUCH"
    TEXT = "TEXT"


class HistorySectionType(str, Enum):
    CHIEF_COMPLAINT = "CHIEF_COMPLAINT"
    HPI = "HPI"
    PAST_MEDICAL_HISTORY = "PAST_MEDICAL_HISTORY"
    PAST_SURGICAL_HISTORY = "PAST_SURGICAL_HISTORY"
    MEDICATIONS = "MEDICATIONS"
    ALLERGIES = "ALLERGIES"
    FAMILY_HISTORY = "FAMILY_HISTORY"
    PERSONAL_HISTORY = "PERSONAL_HISTORY"
    REVIEW_OF_SYSTEMS = "REVIEW_OF_SYSTEMS"
    AYUSH = "AYUSH"


class RiskLevel(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    HIGH_PRIORITY = "HIGH_PRIORITY"
    EMERGENCY = "EMERGENCY"


# Clinical escalation order. Needed because RiskLevel is a str enum, so the
# obvious `max(levels)` compares alphabetically and ranks WARNING above
# HIGH_PRIORITY and EMERGENCY — silently downgrading an emergency.
_RISK_ORDER: Dict[str, int] = {
    RiskLevel.NORMAL: 0,
    RiskLevel.WARNING: 1,
    RiskLevel.HIGH_PRIORITY: 2,
    RiskLevel.EMERGENCY: 3,
}


def highest_risk(levels: Any) -> "RiskLevel":
    """Most severe level in ``levels``, or NORMAL when empty."""
    ranked = [RiskLevel(level) for level in levels]
    if not ranked:
        return RiskLevel.NORMAL
    return max(ranked, key=lambda level: _RISK_ORDER[level])


class HistoryAnswerInput(BaseModel):
    question_id: str
    question_text: str
    answer_type: AnswerType
    raw_answer: str
    audio_url: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    section_type: Optional[str] = None


class ProcessHistoryRequest(BaseModel):
    """Request body sent from Express API to process history answers."""
    session_id: str
    patient_id: str
    language: Language
    section_type: HistorySectionType
    answers: List[HistoryAnswerInput]


class ExtractedMedication(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    is_currently_taking: bool = True
    confidence: float = Field(..., ge=0.0, le=1.0)

    _fix_confidence = field_validator("confidence", mode="before")(_coerce_confidence)


class ExtractedAllergy(BaseModel):
    substance: str
    reaction: Optional[str] = None
    severity: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)

    _fix_confidence = field_validator("confidence", mode="before")(_coerce_confidence)


class ExtractedSymptom(BaseModel):
    name: str
    present: bool
    onset: Optional[str] = None
    duration: Optional[str] = None
    severity: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)

    _fix_confidence = field_validator("confidence", mode="before")(_coerce_confidence)


class HPIStructured(BaseModel):
    onset: Optional[str] = None
    duration: Optional[str] = None
    character: Optional[str] = None
    location: Optional[str] = None
    radiation: Optional[str] = None
    severity: Optional[str] = None
    aggravating: Optional[List[str]] = None
    relieving: Optional[List[str]] = None
    associated_symptoms: Optional[List[str]] = None

class RedFlag(BaseModel):
    type: str
    description: str
    severity: RiskLevel
    category: Optional[str] = None   # CARDIAC | NEUROLOGICAL | ABDOMINAL | PSYCHIATRIC | etc.
    triggered_by: List[str]
    requires_immediate_attention: bool


class TriageClassification(BaseModel):
    """Structured clinical action guidance produced by TriageClassifier.

    Language is protocol-neutral — no hospital-specific codes.
    Intended for display to trained triage staff, not automated ordering.
    """
    overall_severity: RiskLevel
    priority_score: int                     # 0–100; stored in DB for sort ordering
    protocol_action: str                    # generic action guidance
    escalation_targets: List[str]           # which teams to contact
    time_to_intervention_minutes: int
    clinical_categories: List[str]          # distinct categories from triggered flags
    flag_count: int
    requires_immediate_attention: bool


class ExtractionResult(BaseModel):
    """Validated shape of an LLM extraction response.

    ``LLMClient.complete_json`` is handed ``ExtractionResult.model_validate`` so
    a response that matches the JSON Schema but not these constraints (bad
    confidence range, wrong field types) triggers a retry instead of flowing
    into the patient record.
    """
    medications: List[ExtractedMedication] = []
    allergies: List[ExtractedAllergy] = []
    symptoms: List[ExtractedSymptom] = []
    hpi: Optional[HPIStructured] = None
    narrative: Optional[str] = None


class ProcessHistoryResponse(BaseModel):
    """Response from the history processing pipeline."""
    session_id: str
    section_type: HistorySectionType
    processed_answers: List[HistoryAnswerInput]
    extracted_medications: List[ExtractedMedication] = []
    extracted_allergies: List[ExtractedAllergy] = []
    extracted_symptoms: List[ExtractedSymptom] = []
    hpi: Optional[HPIStructured] = None
    red_flags: List[RedFlag] = []
    risk_level: RiskLevel = RiskLevel.NORMAL
    triage_classification: Optional[TriageClassification] = None
    narrative: Optional[str] = None
    processing_duration_ms: int
    model_used: Optional[str] = None
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class ASRTranscribeRequest(BaseModel):
    """Request to transcribe audio via ASR API."""
    audio_base64: str = Field(..., description="Base64-encoded audio data")
    language: Language
    format: Literal["wav", "mp3", "webm", "ogg", "mp4"] = "webm"
    sample_rate: int = 16000
    duration_seconds: Optional[float] = Field(
        None,
        ge=0.0,
        description=(
            "Recording length measured by the client. Compressed containers "
            "(WebM/Opus, MP4) cannot be timed server-side without a demuxer, so "
            "the client reports its own figure and the server enforces the "
            "max-utterance limit against it."
        ),
    )


class ASRTranscribeResponse(BaseModel):
    """Response from ASR."""
    transcript: str
    language: Language
    confidence: float = Field(..., ge=0.0, le=1.0)
    duration_seconds: Optional[float] = None
    processing_duration_ms: int
    provider_used: str

class TTSRequest(BaseModel):
    text: str
    language: str
    speaker: str = "shubh"
    pace: float = 1.0

class TTSResponse(BaseModel):
    audio_base64: str
    format: str
    sample_rate: int
    provider_used: str

class DialogueStateRequest(BaseModel):
    session_id: str
    section_type: HistorySectionType
    language: str
    chief_complaint: Optional[str] = None
    answered_question_ids: List[str]
    collected_answers: List[Dict[str, Any]]

class QuestionOption(BaseModel):
    id: str
    label: str
    hindi_label: Optional[str] = None
    value: str

class ClinicalQuestion(BaseModel):
    id: str
    text: str
    hindi_text: Optional[str] = None
    section_type: HistorySectionType
    input_type: Literal["VOICE_OR_TOUCH", "VOICE_ONLY", "TOUCH_ONLY", "TEXT"]
    options: Optional[List[QuestionOption]] = None
    is_required: bool
    follow_up_condition: Optional[str] = None
    red_flag_triggers: Optional[List[str]] = None

class ProgressEstimate(BaseModel):
    answered: int
    section_total_estimate: int

class NextQuestionResponse(BaseModel):
    section_complete: bool
    question: Optional[ClinicalQuestion] = None
    progress: Optional[ProgressEstimate] = None
    next_section: Optional[str] = None
