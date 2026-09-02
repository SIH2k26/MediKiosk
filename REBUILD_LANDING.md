# Landing Page Redesign Instructions

Target file: pps/kiosk/app/page.tsx

You must completely redesign the landing page to match the NYAAY storytelling structure:
1. **Hero Structure**:
   - **Left side**: Small system eyebrow ("MEDIKIOSK CLINICAL INTELLIGENCE · SYSTEM ONLINE"). Strong editorial headline (ont-serif) "Healthcare starts with being heard." Concise body copy. Two CTAs (Primary "Launch Kiosk ->", Secondary "Doctor View ->"). Small capability strip below.
   - **Right side**: The "Convergence Diagram". Extract this into a client component ConvergenceDiagram within the page or nearby. It must be an animated clinical intelligence convergence diagram using Framer Motion. Central node "MediKiosk" with 4 surrounding nodes (Patient/Language, Extracted Entities, Triage Signal, Doctor Dashboard). Animate deterministic states: input appears -> moves to center -> extracts (symptoms, duration, severity) -> triage updates (Red Flag) -> doctor receives. Loop subtly over 5-8 seconds.
2. **The Problem Section**:
   - Editorial layout. Large statement ont-serif: "A five-minute wait shouldn't cost a doctor five minutes of context."
   - Three cards (Long queues, Language barriers, Fragmented history).
   - "Without MediKiosk vs With MediKiosk" comparison panel with animated transitions/scroll reveals.
3. **Sections**: Follow the progression: Hero -> The Problem -> How It Works (multimodal, AI structured, Doctor confirms) -> Safety First -> Doctor Context -> CTA.
4. **Design Discipline**: Use g-paper text-ink-primary, deliberate grid structures, staggered ramer-motion entrances.

DO NOT break any links to /start or /login. Use the tokens from REBUILD_PROMPT_BASE.md.
