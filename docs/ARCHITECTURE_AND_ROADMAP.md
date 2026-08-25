# MediKiosk — Architecture & Implementation Roadmap
Welcome to the ****MediKiosk**** engineering documentation. This document details the architectural foundation established in Phase 1 and maps out the implementation roadmap for subsequent phases as structured tasks.
---
## 1. What Has Been Done (Phase 1 Foundation)
We have successfully bootstrapped the entire monorepo foundation. All apps, services, and libraries build and typecheck cleanly.

```text
medikiosk/
├── apps/
│   ├── kiosk/           # Patient UI (Next.js, dev on port 3000)
│   ├── doctor/          # Doctor Portal (Next.js, dev on port 3001)
│   └── admin/           # Admin Panel (Next.js, dev on port 3002)
├── services/
│   ├── api/             # Express API Orchestrator (TypeScript, dev on port 4000)
│   ├── ai-history/      # Conversational AI (Python FastAPI, dev on port 8001)
│   └── ai-documents/    # Document OCR & AI extraction (Python FastAPI, dev on port 8002)
├── packages/
│   ├── shared-types/    # Shared TypeScript Interfaces
│   └── clinical-schema/ # Shared Zod Validation Schemas
├── supabase/
│   ├── migrations/      # PostgreSQL Schema & RLS Policies
│   └── seed/            # Development Seed Data
└── docs/                # Developer Guides & Documentation
```

### Key Deliverables Established:
1. ****Monorepo Setup****: Fully configured workspace using `pnpm` and `Turborepo` for fast, parallel builds, typechecking, and execution.

2. ****Shared Clinical Data Models****: 

   - [`@medikiosk/shared-types`](file:///c:/Users/asus/Documents/MediKiosk/packages/shared-types/src/index.ts): Canonical types defining clinical histories, chief complaints, HPI, medications, allergies, timelines, doctor reviews, triage alerts, and AYUSH (Dashavidha Pariksha) assessments.

   - [`@medikiosk/clinical-schema`](file:///c:/Users/asus/Documents/MediKiosk/packages/clinical-schema/src/index.ts): Zod schemas for input validation, API contracts, and AI-pipeline structured extraction schemas.

3. ****Database Migration****: Written [`001_initial_schema.sql`](file:///c:/Users/asus/Documents/MediKiosk/supabase/migrations/001_initial_schema.sql) with 19 core tables. Built custom PostgreSQL functions, updated-at triggers, index optimizations, and Row-Level Security (RLS) policies distinguishing Patients, Doctors, Triage Staff, and Admins.

4. ****Express Backend API****: Integrated with Swagger OpenAPI documentation (`/api/docs`), centralized rate-limiting, Helmet security headers, CORS protection, custom request IDs, global error-handling, and Supabase Auth verification middleware.

5. ****Python AI Services****: FastAPI microservices scaffolded with full Pydantic validations, settings management, dependency matrices, and router structures for conversational history and document OCR processing.

6. ****Frontend App Structures****: Three Next.js 14 applications built with premium glassmorphic typography (`globals.css`), interactive UI micro-animations, and full route structures matching the patient/doctor/admin flows.
---
## 2. Proposed System Architecture
MediKiosk relies on a central API orchestrator that routes data between the storage layer, database system, and specialised Python AI microservices.

```mermaid

graph TD

    classDef frontend fill:#1A73E8,stroke:#0D47A1,color:#FFF;

    classDef backend fill:#252836,stroke:#var(--color-border),color:#FFF;

    classDef db fill:#1E8E3E,stroke:#155724,color:#FFF;

    classDef external fill:#FA7B17,stroke:#A04000,color:#FFF;

    subgraph User Interfaces

        Kiosk["Patient Kiosk (Next.js)"]:::frontend

        Doctor["Doctor Portal (Next.js)"]:::frontend

        Admin["Admin Panel (Next.js)"]:::frontend

    end

    subgraph Orchestration & Logic

        API["Express API (TypeScript)"]:::backend

    end

    subgraph AI Processing Layer

        AIHistory["AI History Service (FastAPI)"]:::backend

        AIDocs["AI Documents Service (FastAPI)"]:::backend

    end

    subgraph Storage & Record

        Supabase["Supabase DB (PostgreSQL)"]:::db

        Storage["Supabase Storage (S3-compatible)"]:::db

    end

    subgraph External Integrations

        Bhashini["Bhashini ASR (Govt of India)"]:::external

        Gemini["Google Gemini (LLM)"]:::external

        HIS["Mock HIS / ABDM Registry"]:::external

    end

    %% Routing

    Kiosk -->|HTTPS| API

    Doctor -->|HTTPS| API

    Admin -->|HTTPS| API

    API -->|Read/Write| Supabase

    API -->|Upload Files| Storage

    API -->|JSON Payload| AIHistory

    API -->|JSON Payload| AIDocs

    %% AI Integrations

    AIHistory -->|Transcribe API| Bhashini

    AIHistory -->|Structured LLM| Gemini

    AIDocs -->|Multi-modal OCR| Gemini

    API -->|Adapters| HIS

```

### Core Architecture Principles:
\- ****Intelligent Processing, Strongly-Typed Persistence****: The database is the system of record. AI services accept temporary payloads, process them, and return schema-validated JSON conforming to Zod expectations before insertion.

\- ****Human in the Loop****: Clinical drafts generated by Gemini are marked as `DOCTOR_REVIEWING` and are fully editable. They only become permanent EHR entities once a doctor explicitly validates them.

\- ****Safety First****: High-risk triage flags (e.g., chest pain + sweating) are evaluated using a deterministic keyword/logic rules engine inside Python, guaranteeing warning generation instead of relying on unpredictable LLM inference.
---
## 3. Future Feature Roadmap (Task Breakdown)
Here is the task layout divided into development modules, tracking all checkboxes needed to take the MVP from mock UI to production-ready.

### Phase 2: Patient Onboarding & Consent
\- [ ] ****Kiosk Registration Forms****

  - [ ] Add basic details input (Name, Age, Gender, Phone)

  - [ ] Integrate phone number OTP verification via Supabase Auth

\- [ ] ****Consent Management Flow****

  - [ ] Render clear multilingual consent texts

  - [ ] Add audio playback buttons to read consent out loud (Hindi, Tamil, Marathi, etc.)

  - [ ] Capture consent state and store IP address, timestamp, and version in `consents` table

\- [ ] ****Walk-in & Queue Session Initialisation****

  - [ ] Enable anonymous intake options

  - [ ] Issue local queue tokens (e.g., `A001`, `A002`) and write metadata to `patient_sessions`

### Phase 3: Conversational Multimodal History Engine
\- [ ] ****Voice Capture & Recording****

  - [ ] Implement browser-native MediaRecorder for audio capture on kiosk

  - [ ] Compress audio to high-quality Ogg/WebM

\- [ ] ****Bhashini ASR Integration****

  - [ ] Implement Bhashini pipeline handshake in `ai-history` router

  - [ ] Route raw voice data to Bhashini APIs and retrieve transcripts

  - [ ] Write fallback routing to OpenAI Whisper if Bhashini is unreachable

\- [ ] ****Adaptive Clinical Questioning Manager****

  - [ ] Setup database-backed questions registry

  - [ ] Design Prompt templates for Gemini 2.0 Flash to evaluate dialogue state

  - [ ] Implement conditional routing (e.g., if chief complaint is `Chest Pain`, pivot to cardiac history template)

\- [ ] ****Real-time Red Flag & Triage Pipeline****

  - [ ] Wire deterministic checks to trigger as answers are added

  - [ ] If high-risk match, insert `triage_alerts` and broadcast via Supabase Realtime

### Phase 4: Medical Document Digitization & OCR
\- [ ] ****Document Upload Interface****

  - [ ] Build drag-and-drop document uploader with camera capture

  - [ ] Configure Supabase Storage private buckets for `medical-documents`

\- [ ] ****Image Preprocessing Pipeline****

  - [ ] Implement deskew, denoise, and thresholding steps in `ai-documents` using OpenCV

\- [ ] ****Hybrid OCR Engine****

  - [ ] Hook up `pytesseract` for high-quality printed English records

  - [ ] Create multimodal Gemini Vision prompts to extract handwritten clinical notes and Hindi reports

\- [ ] ****Clinical Entity Parsing****

  - [ ] Build Gemini parsing functions to map OCR output to Zod schemas

  - [ ] Automatically calculate reference status (`LOW`, `NORMAL`, `HIGH`) for blood parameters (e.g., Hb, Thyroid)

\- [ ] ****Timeline Construction****

  - [ ] Gather all historical records (prescriptions, surgeries) and sort chronologically into `timeline_events`

### Phase 5: Structured Summary Generator
\- [ ] ****Context Aggregation Engine****

  - [ ] Create a service in Express API to pull both history answers and extracted document values

\- [ ] ****Clinical Summary Builder****

  - [ ] Write system instruction templates mapping raw logs to SOAP notes format

  - [ ] Query Gemini to assemble sections: HPI, Active Medications, Chronic Illnesses, Timeline

\- [ ] ****JSON Schema Validation Guardrails****

  - [ ] Run summary output through Zod `ClinicalHistorySchema`

  - [ ] Implement retry loop in API layer to heal invalid LLM returns

### Phase 6: Doctor Review Portal
\- [ ] ****Real-time OPD Queue Dashboard****

  - [ ] Setup Supabase Postgres real-time listeners for immediate queue updates

  - [ ] Visualise triage alerts and high-risk flags with glowing amber/red badge states

\- [ ] ****Interactive Summary Editor****

  - [ ] Build full markdown editor for generated summaries

  - [ ] Highlight AI-extracted values with trace markers showing original document sources

\- [ ] ****Audit Trail Recording****

  - [ ] Capture doctor edits, mapping changes (`SummaryModification`) to `doctor_reviews`

  - [ ] Lock records as confirmed and generate final clinical payload

### Phase 7: HIS & ABDM Integrations
\- [ ] ****FHIR Payload Converter****

  - [ ] Setup adapter to serialize clinical records into FHIR-compliant JSON resources

\- [ ] ****Mock ABDM Service****

  - [ ] Build mock ABDM endpoints for ABHA address lookup, consent registration, and health information sharing

\- [ ] ****HIS Integration Layer****

  - [ ] Build a configurable HIS client to push finalized intake logs straight to hospital database

### Phase 8: System Hardening, Security & Observability
\- [ ] ****Application Monitoring****

  - [ ] Install Sentry middleware across API and Next.js frontends for error reporting

\- [ ] ****AI Traceability & Cost Audit****

  - [ ] Wire Langfuse SDK into Python services to log model latencies, token consumption, and prompt runs

\- [ ] ****Security Hardening****

  - [ ] Set up secure JWT expiration parameters

  - [ ] Validate Supabase signed URLs for secure document access

  - [ ] Configure automatic media deletion triggers (retention policy) for patient privacy
