# Doctor Dashboard Redesign Instructions

Target files: pps/doctor/app/page.tsx, pps/doctor/app/triage/page.tsx

The Doctor View must look like the destination of the kiosk workflow. It should convey: "I have the patient's context before the consultation begins."

## Key Elements to Emphasize
- **Patient Banner**: Name, language, intake status.
- **Consultation Readiness**: A badge like "AI PREPARED · REVIEW REQUIRED" (ont-mono text-[12px]).
- **Chief Complaint**: Large, readable summary.
- **Extracted Clinical Entities**: Clearly structured cards/tags for Symptoms, Duration, Severity, Associated Symptoms using ont-mono.
- **Timeline**: Chronological intake information.
- **Triage**: Clear priority state (e.g. Red Flag).

## UI/UX
- Use strict layout grids. Avoid bordered rectangles everywhere; use subtle g-paper-raised with internal spacing.
- Add meaningful micro-interactions and transitions (Framer Motion).
- Retain all etchLiveQueue, etchPatient logic, including the JWT auth headers we just added. Do not break backend integration.
