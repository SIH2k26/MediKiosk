"""Pydantic models for the AI Documents Service."""
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


class EntityType(str, Enum):
    MEDICATION = "MEDICATION"
    INVESTIGATION = "INVESTIGATION"
    DIAGNOSIS = "DIAGNOSIS"
    SURGERY = "SURGERY"
    ALLERGY = "ALLERGY"
    DATE = "DATE"
    DOCTOR = "DOCTOR"
    HOSPITAL = "HOSPITAL"
    OTHER = "OTHER"


class ProcessDocumentRequest(BaseModel):
    document_id: str
    storage_url: str = Field(..., description="Supabase Storage signed URL")
    mime_type: str
    language: Language = Language.HINDI


class ExtractedMedication(BaseModel):
    name: str
    generic_name: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    is_currently_taking: bool = True
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_document_id: Optional[str] = None
    page_number: Optional[int] = None


class ExtractedInvestigation(BaseModel):
    name: str
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[Literal["LOW", "NORMAL", "HIGH", "CRITICAL", "UNKNOWN"]] = None
    test_date: Optional[str] = None
    is_abnormal: Optional[bool] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_document_id: Optional[str] = None
    page_number: Optional[int] = None


class ExtractedAllergy(BaseModel):
    substance: str
    reaction: Optional[str] = None
    severity: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_document_id: Optional[str] = None
    page_number: Optional[int] = None


class ExtractedEntity(BaseModel):
    entity_type: EntityType
    value: str
    normalized_value: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    page_number: Optional[int] = None


class TimelineEvent(BaseModel):
    event_year: Optional[int] = None
    event_date: Optional[str] = None
    event_type: str
    title: str
    description: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class ProcessDocumentResponse(BaseModel):
    document_id: str
    ocr_text: str
    ocr_confidence: float = Field(..., ge=0.0, le=1.0)
    page_count: int
    extracted_entities: List[ExtractedEntity] = []
    medications: List[ExtractedMedication] = []
    investigations: List[ExtractedInvestigation] = []
    allergies: List[ExtractedAllergy] = []
    timeline_events: List[TimelineEvent] = []
    processing_duration_ms: int
    model_used: Optional[str] = None

class BatchProcessRequest(BaseModel):
    documents: List[ProcessDocumentRequest]


class DocumentProcessResult(BaseModel):
    document_id: str
    success: bool
    result: Optional[ProcessDocumentResponse] = None
    error: Optional[str] = None


class BatchProcessResponse(BaseModel):
    results: List[DocumentProcessResult]
    total: int
    succeeded: int
    failed: int
