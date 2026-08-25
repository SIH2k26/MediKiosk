"""Pydantic models for the AI History Service."""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from enum import Enum


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


class HistoryAnswerInput(BaseModel):
    question_id: str
    question_text: str
    answer_type: AnswerType
    raw_answer: str
    audio_url: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)


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


class ExtractedAllergy(BaseModel):
    substance: str
    reaction: Optional[str] = None
    severity: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class RedFlag(BaseModel):
    type: str
    description: str
    severity: RiskLevel
    triggered_by: List[str]
    requires_immediate_attention: bool


class ProcessHistoryResponse(BaseModel):
    """Response from the history processing pipeline."""
    session_id: str
    section_type: HistorySectionType
    processed_answers: List[HistoryAnswerInput]
    extracted_medications: List[ExtractedMedication] = []
    extracted_allergies: List[ExtractedAllergy] = []
    red_flags: List[RedFlag] = []
    risk_level: RiskLevel = RiskLevel.NORMAL
    narrative: Optional[str] = None
    processing_duration_ms: int
    model_used: Optional[str] = None
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class ASRTranscribeRequest(BaseModel):
    """Request to transcribe audio via Bhashini API."""
    audio_base64: str = Field(..., description="Base64-encoded audio data")
    language: Language
    format: Literal["wav", "mp3", "webm", "ogg"] = "webm"
    sample_rate: int = 16000


class ASRTranscribeResponse(BaseModel):
    """Response from Bhashini ASR."""
    transcript: str
    language: Language
    confidence: float = Field(..., ge=0.0, le=1.0)
    duration_seconds: Optional[float] = None
    processing_duration_ms: int
