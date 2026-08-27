"""Document processing router."""
import time
import logging

import httpx
from fastapi import APIRouter, HTTPException

from app.models.schemas import ProcessDocumentRequest, ProcessDocumentResponse
from app.ocr.pipeline import OCRPipeline
from app.extraction.entities import EntityExtractor
from app.timeline.builder import TimelineBuilder
from app.normalization.normalizer import normalize_medication_name, normalize_investigation_name, normalize_unit
from app.analysis.abnormal_detector import classify_investigation

logger = logging.getLogger(__name__)

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
    5. Normalization of medication/investigation names
    6. Abnormal value detection (deterministic comparison)
    7. Timeline event extraction
    """
    start_ms = int(time.time() * 1000)

    # Step 1: Download document from Supabase Storage
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(request.storage_url)
            resp.raise_for_status()
            image_bytes = resp.content
    except Exception as e:
        logger.error(f"Failed to download document {request.document_id}: {e}")
        raise HTTPException(status_code=400, detail=f"Could not download document: {e}")

    # Step 2 + 3: Preprocessing + OCR
    try:
        ocr_result = ocr_pipeline.process(
            image_bytes, request.mime_type, language=request.language.value
        )
    except Exception as e:
        logger.error(f"OCR failed for document {request.document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {e}")

    # Step 4: Entity extraction (per-page, for traceability)
    extraction_result = entity_extractor.extract_with_traceability(
        ocr_result.page_texts, language=request.language.value
    )

    # Step 5: Normalization — clean up medication/investigation names in place
    for med in extraction_result["medications"]:
        _, normalized, conf = normalize_medication_name(med.name)
        if normalized and conf >= 0.75:
            med.generic_name = med.generic_name or normalized

    for inv in extraction_result["investigations"]:
        _, normalized, conf = normalize_investigation_name(inv.name)
        if normalized and conf >= 0.75:
            inv.name = normalized
        if inv.unit:
            inv.unit = normalize_unit(inv.unit)

    # Step 6: Abnormal value detection
    for inv in extraction_result["investigations"]:
        status, is_abnormal, _ = classify_investigation(
            normalized_name=inv.name,
            raw_value=inv.value,
            unit=inv.unit,
            document_reference_range=inv.reference_range,
        )
        inv.status = status
        inv.is_abnormal = is_abnormal

    # Step 7: Timeline construction
    timeline_events = timeline_builder.build(extraction_result)

    duration_ms = int(time.time() * 1000) - start_ms

    return ProcessDocumentResponse(
        document_id=request.document_id,
        ocr_text=ocr_result.text,
        ocr_confidence=ocr_result.confidence,
        page_count=ocr_result.page_count,
        extracted_entities=extraction_result["entities"],
        medications=extraction_result["medications"],
        investigations=extraction_result["investigations"],
        allergies=extraction_result["allergies"],
        timeline_events=timeline_events,
        processing_duration_ms=duration_ms,
        model_used=entity_extractor.model.model_name if hasattr(entity_extractor.model, "model_name") else None,
    )