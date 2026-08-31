# AI Documents Service

FastAPI service responsible for turning uploaded medical documents (prescriptions,
lab reports, discharge summaries) into structured, clinically useful data.

Part of the MediKiosk platform — see the root `README.md` for full system context.

## What this service does

```
Document (image/PDF)
        ↓
OCR (Sarvam AI Digitise)
        ↓
Clinical entity extraction (Gemini)
        ↓
Normalization (medication/investigation names)
        ↓
Abnormal value detection (reference ranges)
        ↓
Timeline construction
        ↓
Structured response
```

This service does **not** talk to Supabase directly. It receives a `storage_url`
pointing to an already-uploaded document (uploaded via the Node/Express API),
downloads it, processes it, and returns structured JSON. The Express API owns
storage and persistence.

## Endpoints

### `POST /documents/process`
Process a single document.

**Request:**
```json
{
  "document_id": "doc-123",
  "storage_url": "https://...",
  "mime_type": "image/jpeg",
  "language": "en"
}
```

**Response:** see `ProcessDocumentResponse` in `app/models/schemas.py` —
includes OCR text, extracted entities, medications, investigations,
allergies, and a chronological timeline.

### `POST /documents/process-batch`
Process multiple documents concurrently (capped at 3 concurrent requests to
stay under Sarvam's rate limit). One document failing doesn't block the rest —
each result is reported independently with its own success/error status.

**Request:**
```json
{
  "documents": [
    { "document_id": "doc-1", "storage_url": "...", "mime_type": "image/jpeg", "language": "en" },
    { "document_id": "doc-2", "storage_url": "...", "mime_type": "image/jpeg", "language": "hi" }
  ]
}
```

### `GET /health`
Basic health check.

## Setup

```bash
cd services/ai-documents
pip install -r requirements.txt
cp .env.example .env   # then fill in real values
uvicorn app.main:app --reload
```

## Environment variables

| Variable | Purpose |
|---|---|
| `SARVAM_API_KEY` | OCR via Sarvam AI Document Intelligence |
| `GOOGLE_GEMINI_API_KEY` | Clinical entity extraction |
| `GEMINI_MODEL` | Model name, e.g. `gemini-2.0-flash` |
| `API_BASE_URL` | Node/Express API base URL |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST` | LLM call tracing/observability |

## Module layout

```
app/
├── ocr/pipeline.py            OCR via Sarvam AI Digitise
├── extraction/entities.py     Gemini-based clinical entity extraction
├── normalization/normalizer.py Medication/investigation name cleanup
├── analysis/abnormal_detector.py Reference-range comparison, LOW/NORMAL/HIGH/CRITICAL
├── timeline/builder.py        Chronological event construction
├── models/schemas.py          Pydantic request/response models
├── routers/documents.py       API endpoints, wires the above together
├── config.py                  Settings from environment
└── main.py                    FastAPI app entrypoint
```

## Known limitations / TODOs

- **Multi-page traceability**: Sarvam's Digitise returns one combined text
  block per document rather than true per-page text, so `page_number` on
  extracted entities is not yet accurate for multi-page PDFs — currently
  everything is attributed to page 1 for multi-page documents.
- **Handwritten text**: Sarvam handles this significantly better than the
  previous Tesseract pipeline, but very messy handwriting can still produce
  low-confidence or incorrect extractions (e.g. medication names) — these
  are flagged with lower confidence scores rather than silently trusted.
- **Cross-document merging**: each call processes one document's timeline in
  isolation. Merging multiple documents into one unified patient history is
  not handled here (see `ai-history` service or a future addition).
- **RxNorm/LOINC integration**: normalization currently uses small local
  reference lists with fuzzy matching. Swapping in real RxNorm/LOINC API
  lookups would improve coverage beyond the common medications/tests listed.