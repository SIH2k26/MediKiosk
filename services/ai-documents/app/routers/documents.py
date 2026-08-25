"""Document processing router."""
import time
from fastapi import APIRouter, HTTPException
from app.models.schemas import ProcessDocumentRequest, ProcessDocumentResponse
from app.ocr.pipeline import OCRPipeline
from app.extraction.entities import EntityExtractor
from app.timeline.builder import TimelineBuilder

router = APIRouter()
ocr_pipeline = OCRPipeline()
entity_extractor = EntityExtractor()
timeline_builder = TimelineBuilder()


@router.post("/process", response_model=ProcessDocumentResponse)
async def process_document(request: ProcessDocumentRequest) -> ProcessDocumentResponse:
    """
    Full document processing pipeline:
    1. Download document from Supabase Storage URL
    2. Image preprocessing (deskew, denoise, contrast enhancement)
    3. OCR (Tesseract + Gemini Vision for handwritten/complex)
    4. Clinical entity extraction (medications, investigations, allergies)
    5. Timeline event extraction
    6. Abnormal value detection (deterministic comparison)
    
    Phase 4: Full implementation.
    """
    start_ms = int(time.time() * 1000)

    # TODO Phase 4: Implement full pipeline
    # Step 1: Download from storage_url
    # Step 2: Run OCRPipeline
    # Step 3: Run EntityExtractor
    # Step 4: Run TimelineBuilder
    # Step 5: Run abnormal value detection

    duration_ms = int(time.time() * 1000) - start_ms

    # Stub response
    return ProcessDocumentResponse(
        document_id=request.document_id,
        ocr_text="[Phase 4: OCR not yet implemented]",
        ocr_confidence=0.0,
        page_count=0,
        extracted_entities=[],
        medications=[],
        investigations=[],
        allergies=[],
        timeline_events=[],
        processing_duration_ms=duration_ms,
        model_used=None,
    )
