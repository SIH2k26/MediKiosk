Works: Complete E2E dialogue routing, deterministic red-flag evaluations, and cross-section isolation (HPI, PMH, etc.). Frontend race conditions (Strict Mode, TTS overlaps) have been resolved.
Stubbed: None (Using live LLM endpoints with Gemini fallback).
Broken: None currently identified.
**I assumed about other people's data:**
- **Dev 2 (Kiosk):** I assumed your session/patient initialization provides a valid `session.id` and `session.lang` before hitting the history route. I modified `apps/kiosk/app/history` to fix race conditions, so please review my changes before making your own modifications there.
- **Dev 4 (Summary/Triage):** I assumed you will consume our extracted entities. The exact JSON shape of the history output you need to consume is defined below.

---

### Data Shape for Dev 4 (Extracted Entities & History)
When a section is completed, the API returns the following `ProcessHistoryResponse` shape. Dev 4 should consume `extracted_symptoms`, `red_flags`, and `hpi` to generate the clinical summary:

```json
{
  "session_id": "string",
  "section_type": "CHIEF_COMPLAINT | HPI | PAST_MEDICAL_HISTORY | ...",
  "processed_answers": [
    {
      "question_id": "string",
      "question_text": "string",
      "answer_type": "VOICE | TOUCH | TEXT",
      "raw_answer": "string",
      "section_type": "string"
    }
  ],
  "extracted_medications": [{"name": "string", "dosage": "string", "frequency": "string"}],
  "extracted_allergies": [{"substance": "string", "reaction": "string"}],
  "extracted_symptoms": [
    {
      "name": "string",
      "present": true,
      "onset": "string",
      "duration": "string",
      "severity": "string"
    }
  ],
  "hpi": {
    "location": "string",
    "quality": "string",
    "severity": "string",
    "timing": "string",
    "context": "string",
    "modifying_factors": "string",
    "associated_symptoms": ["string"]
  },
  "red_flags": [
    {
      "type": "POTENTIAL_ACS | POTENTIAL_STROKE | SEVERE_ABDOMINAL | ...",
      "description": "string",
      "severity": "EMERGENCY | WARNING",
      "triggered_by": ["string"],
      "requires_immediate_attention": true
    }
  ],
  "risk_level": "EMERGENCY | WARNING | NORMAL",
  "narrative": "string (optional LLM summary)",
  "confidence": 0.95
}
```
