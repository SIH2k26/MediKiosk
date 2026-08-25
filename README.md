# MediKiosk

> **AI-Powered Clinical History & Patient Intake Platform**

MediKiosk is a patient-facing clinical intake and history-taking platform designed for high-throughput hospital OPDs.

The platform enables patients to independently provide their medical history through **voice and touch**, digitize existing medical documents, and receive a structured clinical summary that can be reviewed and edited by a physician before consultation.

MediKiosk is designed particularly for Indian healthcare environments where limited consultation time, fragmented physical records, multilingual patients, and large OPD volumes create significant challenges in comprehensive clinical history-taking.

---

## Table of Contents

* [Overview](#overview)
* [Problem Statement](#problem-statement)
* [Objectives](#objectives)
* [Key Features](#key-features)
* [Patient Journey](#patient-journey)
* [System Architecture](#system-architecture)
* [Technology Stack](#technology-stack)
* [Application Architecture](#application-architecture)
* [Repository Structure](#repository-structure)
* [Core Modules](#core-modules)
* [Database Architecture](#database-architecture)
* [Clinical Data Model](#clinical-data-model)
* [AI Architecture](#ai-architecture)
* [Conversational History Engine](#conversational-history-engine)
* [Medical Document AI](#medical-document-ai)
* [Clinical Summary Engine](#clinical-summary-engine)
* [Red-Flag Detection](#red-flag-detection)
* [AYUSH Mode](#ayush-mode)
* [Doctor Dashboard](#doctor-dashboard)
* [Authentication & Authorization](#authentication--authorization)
* [Consent & Privacy](#consent--privacy)
* [ABDM & HIS Integration](#abdm--his-integration)
* [API Architecture](#api-architecture)
* [Development Workflow](#development-workflow)
* [Team Responsibilities](#team-responsibilities)
* [Development Phases](#development-phases)
* [Testing Strategy](#testing-strategy)
* [AI Evaluation](#ai-evaluation)
* [Security](#security)
* [Deployment](#deployment)
* [Environment Variables](#environment-variables)
* [Getting Started](#getting-started)
* [Git Workflow](#git-workflow)
* [Coding Standards](#coding-standards)
* [Definition of Done](#definition-of-done)
* [MVP Scope](#mvp-scope)
* [Future Enhancements](#future-enhancements)
* [Important Clinical Safety Principles](#important-clinical-safety-principles)

---

# Overview

MediKiosk is an AI-assisted clinical intake platform that moves structured history-taking and medical-document processing to the **beginning of the patient journey**.

Instead of a doctor spending several minutes manually collecting basic history and searching through physical documents, the patient completes an assisted intake process before entering the consultation room.

The system combines:

* Conversational AI
* Speech recognition
* Touch-based interaction
* Medical document OCR
* Clinical information extraction
* Medical timeline generation
* Structured history generation
* Red-flag detection
* Physician review
* Consent management
* ABDM/HIS integration

The final output is a **physician-reviewable clinical history draft**, not an autonomous diagnosis.

---

# Problem Statement

Large Indian hospital OPDs often operate under severe time constraints. Doctors may need to simultaneously:

* Elicit the patient's history
* Review previous records
* Perform examination
* Formulate a diagnosis
* Counsel the patient
* Prescribe treatment

Patients may also arrive carrying:

* Paper prescriptions
* Laboratory reports
* Discharge summaries
* Imaging reports
* Handwritten documents
* Records from multiple hospitals

These records are frequently unstructured, chronologically disordered, handwritten, or written in different languages.

The problem statement identifies the lack of a patient-facing system capable of combining:

1. Comprehensive clinical history acquisition
2. Voice-based interaction
3. Touch-based interaction
4. Medical document digitization
5. Clinical information extraction
6. Structured history generation
7. Physician review
8. HIS integration
9. ABDM interoperability

MediKiosk addresses this first-mile clinical information problem.

---

# Objectives

MediKiosk aims to:

1. Reduce the time doctors spend collecting routine clinical history.
2. Improve completeness and consistency of history-taking.
3. Allow patients to communicate naturally through voice or touch.
4. Support Indian languages and varying levels of digital literacy.
5. Digitize physical medical documents.
6. Extract clinically relevant information from documents.
7. Organize historical medical information chronologically.
8. Detect potentially urgent symptoms and alert triage staff.
9. Generate a structured physician-readable clinical summary.
10. Allow physicians to verify, edit, accept, or reject AI-generated information.
11. Preserve patient consent and auditability.
12. Provide a foundation for ABDM/HIS interoperability.

---

# Key Features

## Patient Features

* Multilingual onboarding
* Voice-guided interaction
* Touch-based interaction
* Patient registration
* ABHA-based identification where available
* Consent management
* Adaptive clinical questioning
* Medical document scanning/upload
* Document preview
* AI-generated history review
* Patient confirmation
* Queue/token information

## Clinical AI

* Speech-to-text
* Clinical entity extraction
* Adaptive questioning
* Structured HPI generation
* Review of systems
* Medication extraction
* Allergy extraction
* Investigation extraction
* Medical timeline generation
* Abnormal-value detection
* Red-flag detection
* Clinical summary generation

## Doctor Features

* OPD queue
* Patient prioritization
* Structured clinical summary
* Medical timeline
* Extracted investigations
* Medications
* Allergies
* Source documents
* AI flags
* Editable summary
* Accept/reject AI-generated information
* Final physician confirmation

## Administrative Features

* User management
* Role management
* Kiosk management
* System monitoring
* Audit logs
* Configuration
* Language configuration
* Clinical questionnaire configuration

---

# Patient Journey

MediKiosk follows five primary stages.

```text
┌──────────────┐
│ 1. IDENTIFY  │
└──────┬───────┘
       ↓
┌──────────────┐
│ 2. CONVERSE  │
└──────┬───────┘
       ↓
┌──────────────┐
│   3. SCAN    │
└──────┬───────┘
       ↓
┌──────────────┐
│4. SUMMARIZE  │
│   & ROUTE    │
└──────┬───────┘
       ↓
┌──────────────┐
│  5. CONSULT  │
└──────────────┘
```

## 1. Identify

The patient:

* Selects a language
* Identifies themselves
* Provides ABHA information where available
* Registers as a new patient if necessary
* Provides consent

## 2. Converse

The AI conducts a structured clinical history interview using:

* Voice
* Touch
* Adaptive questioning
* Clinical history templates

## 3. Scan

The patient scans/uploads:

* Prescriptions
* Laboratory reports
* Discharge summaries
* Other medical documents

The system processes the documents using OCR and clinical extraction.

## 4. Summarize & Route

The platform:

* Combines conversation data
* Combines extracted document data
* Creates a clinical timeline
* Detects potential red flags
* Generates a structured clinical summary
* Routes the patient appropriately

## 5. Consult

The doctor:

* Opens the patient record
* Reviews the AI-generated summary
* Reviews source documents
* Edits/validates information
* Uses the structured history during consultation

---

# System Architecture

```text
                         MEDIKIOSK
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
          ▼                                   ▼
 ┌─────────────────┐                 ┌─────────────────┐
 │ Patient Kiosk   │                 │ Doctor Portal   │
 │ Next.js         │                 │ Next.js         │
 │ TypeScript      │                 │ TypeScript      │
 └────────┬────────┘                 └────────┬────────┘
          │                                   │
          └────────────────┬──────────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Node.js + Express   │
                │ TypeScript API      │
                └──────────┬──────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
       ┌──────────┐  ┌───────────┐  ┌─────────────┐
       │ Supabase │  │ AI Service │  │ Integration │
       │          │  │ FastAPI    │  │ Layer       │
       └──────────┘  └─────┬──────┘  └──────┬──────┘
                           │                │
                 ┌─────────┼─────────┐      │
                 │         │         │      │
                 ▼         ▼         ▼      ▼
                ASR       OCR       LLM   ABDM/HIS
```

---

# Technology Stack

## Frontend

### Next.js

Next.js is used for the web applications because MediKiosk contains multiple application surfaces and benefits from:

* File-based routing
* Server/client component separation
* TypeScript support
* Middleware
* Authentication integration
* API/client organization
* Production optimization

The main UI will still behave like a kiosk application. We are not using Next.js simply for SEO.

### TypeScript

TypeScript is strongly recommended because the project contains many structured clinical objects.

For example:

```typescript
interface ClinicalHistory {
  chiefComplaint: string;
  hpi: HPI;
  pastMedicalHistory: MedicalCondition[];
  pastSurgicalHistory: Surgery[];
  medications: Medication[];
  allergies: Allergy[];
  familyHistory: FamilyHistory;
  personalHistory: PersonalHistory;
  reviewOfSystems: ReviewOfSystems;
}
```

Shared types should be used across the frontend and backend wherever practical.

---

## Backend

* Node.js
* Express
* TypeScript
* Zod
* OpenAPI/Swagger

Express handles:

* Authentication flows
* Authorization
* Business logic
* Patient APIs
* Session management
* Consent
* Document orchestration
* AI service orchestration
* Doctor APIs
* ABDM/HIS adapters
* Audit logging

---

# AI Services

AI/ML functionality is separated from the main Node.js application.

### Python

* Python 3
* FastAPI
* Pydantic
* PyTorch where required
* OpenCV
* OCR frameworks
* ML/LLM tooling

Python is used because the AI layer may require:

* Speech models
* OCR
* NLP
* Medical information extraction
* LLM pipelines
* Evaluation frameworks

---

# Database

## Supabase

Supabase is the primary backend data platform.

It provides:

* PostgreSQL
* Authentication
* Storage
* Realtime
* Row Level Security
* pgvector

Supabase is the **system of record**.

The AI services should not directly become the source of truth for patient information.

---

# Storage

Supabase Storage is used for:

```text
medical-documents/
audio-recordings/
processed-documents/
```

Database records contain metadata and references to stored files.

---

# Vector Search

pgvector may be used for:

* Clinical ontology retrieval
* Medical terminology normalization
* Document retrieval
* Internal knowledge retrieval
* RAG-based contextual assistance

Vector search should only be introduced where it provides a measurable benefit.

The system should not use RAG simply because it is an AI project.

---

# Observability

## Application

Use Sentry or an equivalent monitoring platform for:

* Errors
* Exceptions
* Performance
* Frontend failures
* Backend failures

## AI

Use Langfuse or equivalent AI observability for:

* LLM latency
* Token usage
* Prompt versions
* Model responses
* Trace inspection
* Cost monitoring
* AI pipeline debugging

Sensitive production patient data must not be unnecessarily exposed to third-party observability systems.

---

# Repository Structure

Recommended monorepo structure:

```text
medikiosk/
│
├── apps/
│   ├── kiosk/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   │
│   ├── doctor/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   └── lib/
│   │
│   └── admin/
│       ├── app/
│       ├── components/
│       └── features/
│
├── services/
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   └── app.ts
│   │   └── tests/
│   │
│   ├── ai-history/
│   │   ├── app/
│   │   ├── models/
│   │   ├── pipelines/
│   │   ├── rules/
│   │   └── tests/
│   │
│   └── ai-documents/
│       ├── app/
│       ├── ocr/
│       ├── extraction/
│       ├── timeline/
│       └── tests/
│
├── packages/
│   ├── shared-types/
│   ├── clinical-schema/
│   ├── api-client/
│   └── validation/
│
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── functions/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── clinical/
│   ├── ai/
│   └── decisions/
│
├── infrastructure/
│   ├── docker/
│   └── nginx/
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

# Core Modules

MediKiosk consists of four primary functional modules.

```text
Module A → Conversational Multimodal History Engine

Module B → Medical Document Digitization & Intelligence

Module C → Structured History Summary Generator

Module D → Consent, Privacy & ABDM Integration
```

---

# Module A — Conversational Multimodal History Engine

The conversational engine combines:

```text
Voice
 +
Touch
 +
Clinical ontology
 +
Dialogue manager
 +
ASR
 +
TTS
 +
Red-flag rules
```

---

## Dual-Mode Interaction

Every question should ideally support:

```text
Voice Answer
      OR
Touch Answer
```

Example:

```text
How severe is the pain?

🎤 Speak

[ Mild ]
[ Moderate ]
[ Severe ]
```

This allows the system to work for users with different literacy and technology comfort levels.

---

# Clinical History Ontology

The system should not allow an LLM to freely invent the interview structure.

Instead, the application maintains a structured clinical history ontology.

```text
Chief Complaint
      ↓
HPI
      ↓
Past Medical History
      ↓
Past Surgical History
      ↓
Medication History
      ↓
Drug & Allergy History
      ↓
Family History
      ↓
Personal History
      ↓
Review of Systems
```

Complaint-specific modules can then be attached.

Example:

```text
Chest Pain
 ├── Onset
 ├── Duration
 ├── Character
 ├── Location
 ├── Radiation
 ├── Severity
 ├── Aggravating Factors
 ├── Relieving Factors
 └── Associated Symptoms
```

---

# Adaptive Questioning

The dialogue manager should determine the next question using:

1. Clinical template
2. Previously collected answers
3. Missing required information
4. Conditional branches
5. Red-flag rules

Example:

```text
Chief complaint = chest pain
        ↓
Ask onset
        ↓
Ask duration
        ↓
Ask character
        ↓
Ask radiation
        ↓
Ask severity
        ↓
Check associated symptoms
        ↓
Evaluate red flags
```

---

# Module B — Medical Document Digitization

Document processing pipeline:

```text
Document
   ↓
Image/PDF preprocessing
   ↓
OCR
   ↓
Raw text
   ↓
Clinical entity extraction
   ↓
Normalization
   ↓
Validation
   ↓
Timeline
   ↓
Database
```

Supported document categories include:

* Prescriptions
* Laboratory reports
* Discharge summaries
* Investigation reports
* Procedure/surgery records

---

# OCR Pipeline

```text
Input Image
     ↓
Deskew
     ↓
Denoise
     ↓
Contrast Enhancement
     ↓
Crop / Layout Detection
     ↓
OCR
     ↓
Text
```

The OCR layer should be designed to support:

* Printed text
* Handwritten text where feasible
* Hindi
* English
* Additional Indian languages as the system expands

---

# Clinical Entity Extraction

Example input:

```text
Hb: 9.2 g/dL

Metformin 500 mg twice daily

Allergy: Penicillin

Appendectomy performed in 2021
```

Structured output:

```json
{
  "investigations": [
    {
      "name": "Hemoglobin",
      "value": 9.2,
      "unit": "g/dL"
    }
  ],
  "medications": [
    {
      "name": "Metformin",
      "dose": "500 mg",
      "frequency": "twice daily"
    }
  ],
  "allergies": [
    "Penicillin"
  ],
  "surgeries": [
    {
      "procedure": "Appendectomy",
      "year": 2021
    }
  ]
}
```

---

# Medical Timeline

The system converts extracted historical events into a chronological timeline.

```text
2019
 │
 └── Condition diagnosed
       │
2021
 │
 └── Surgery
       │
2023
 │
 └── Laboratory investigation
       │
2025
 │
 └── Medication changed
       │
2026
 │
 └── Current consultation
```

This allows the physician to understand the patient's history quickly.

---

# Abnormal Investigation Detection

Where reference ranges are available:

```text
Extract value
      ↓
Normalize unit
      ↓
Find reference range
      ↓
Compare
      ↓
LOW / NORMAL / HIGH
```

Numerical comparison should be deterministic whenever possible rather than relying entirely on an LLM.

---

# Module C — Structured History Summary Generator

The summary engine receives structured information from:

```text
Conversation
+
Documents
+
Timeline
+
Clinical entities
```

It generates:

```text
Chief Complaint

History of Present Illness

Past Medical History

Past Surgical History

Drug & Allergy History

Family History

Personal History

Review of Systems

Previous Investigations

Relevant Document Timeline
```

---

# AI Summary Safety

The summary is:

> **A physician-reviewable draft, not an autonomous diagnosis.**

Workflow:

```text
Patient Data
     ↓
Structured Clinical Data
     ↓
LLM Summary
     ↓
Schema Validation
     ↓
Doctor Review
     ↓
Edit / Accept / Reject
     ↓
Final Clinical Record
```

The physician remains the final decision-maker.

---

# Module D — Consent, Privacy & ABDM

This module manages:

* Patient consent
* Consent explanation
* Consent recording
* Consent withdrawal
* Data access permissions
* Session termination
* Audit logs
* ABDM integration
* HIS integration

Consent should be understandable to users with low literacy through:

* Audio explanation
* Simple language
* Large controls
* Visual indicators

---

# Red-Flag Detection

Red-flag detection should use a **hybrid architecture**.

```text
Patient Answer
      ↓
ASR / Input Processing
      ↓
Clinical Entity Extraction
      ↓
Structured Symptoms
      ↓
Deterministic Rules
      ↓
Risk Level
```

Example:

```text
Chest Pain
+
Shortness of Breath
+
Sudden Onset
+
Sweating
        ↓
Potential Emergency
        ↓
HIGH PRIORITY
        ↓
Triage Alert
```

Possible risk levels:

```text
NORMAL
WARNING
HIGH_PRIORITY
EMERGENCY
```

The system should not claim a diagnosis.

It should indicate that a **clinical review or triage assessment may be required**.

---

# AYUSH Mode

For AYUSH institutions, the history engine supports an extended assessment.

The problem statement identifies the following Dashavidha Pariksha parameters:

```text
Prakriti
Vikriti
Sara
Samhanana
Pramana
Satmya
Sattva
Ahara Shakti
Vyayama Shakti
Vaya
```

Additional Ahara-Vihara information can also be collected.

Architecture:

```text
                 History Engine
                       │
            ┌──────────┴──────────┐
            │                     │
            ▼                     ▼
    Standard Clinical        AYUSH Clinical
       Template                 Template
```

AYUSH-specific logic should remain modular so that the main platform does not become tightly coupled to one clinical framework.

---

# Doctor Dashboard

The doctor portal provides a structured view of each patient.

```text
OPD Queue
   ↓
Patient
   ↓
┌───────────────────────────┐
│ Clinical Summary          │
├───────────────────────────┤
│ Chief Complaint            │
│ HPI                        │
│ Medical History            │
│ Medications                │
│ Allergies                  │
│ Investigations             │
│ Timeline                   │
│ AI Flags                   │
└───────────────────────────┘
```

---

# Doctor Review Workflow

```text
AI Generated Summary
        ↓
Doctor Opens Record
        ↓
Review
        ↓
Edit
        ↓
Confirm
        ↓
Final Clinical Record
```

The system should preserve:

* Original AI output
* Doctor modifications
* Final version
* Doctor ID
* Timestamp

This provides traceability.

---

# Authentication & Authorization

Supabase Auth manages authentication.

Roles:

```text
PATIENT
DOCTOR
TRIAGE_STAFF
ADMIN
```

Authorization must be enforced at both:

* API level
* Database level

Supabase Row Level Security should be enabled for sensitive patient tables.

---

# Database Architecture

Core tables:

```text
profiles
patients
patient_sessions
consents

clinical_histories
history_sections
history_answers

documents
document_pages
extracted_entities

investigations
medications
allergies
procedures

clinical_summaries
doctor_reviews

triage_alerts
audit_logs
```

---

# High-Level Relationships

```text
Patient
 │
 ├── Sessions
 │
 ├── Consents
 │
 ├── Clinical History
 │      └── Answers
 │
 ├── Documents
 │      ├── Pages
 │      └── Extracted Entities
 │
 ├── Investigations
 │
 ├── Medications
 │
 ├── Allergies
 │
 ├── Triage Alerts
 │
 └── Clinical Summaries
          │
          └── Doctor Reviews
```

---

# Clinical Data Model

A canonical clinical schema should be shared across services.

Example:

```typescript
interface ClinicalHistory {
  patientId: string;
  chiefComplaint: ChiefComplaint[];
  hpi: HPI;
  pastMedicalHistory: MedicalCondition[];
  pastSurgicalHistory: Surgery[];
  medications: Medication[];
  allergies: Allergy[];
  familyHistory: FamilyHistory;
  personalHistory: PersonalHistory;
  reviewOfSystems: ReviewOfSystems;
  investigations: Investigation[];
}
```

The exact schema should evolve through version-controlled migrations.

---

# API Architecture

The Express API acts as the central orchestration layer.

Example endpoints:

```text
Authentication
POST   /api/auth/session

Patients
POST   /api/patients
GET    /api/patients/:id

Consent
POST   /api/consents
GET    /api/consents/:patientId

History
POST   /api/history/sessions
POST   /api/history/sessions/:id/answers
GET    /api/history/:patientId

Documents
POST   /api/documents
GET    /api/documents/:id
POST   /api/documents/:id/process

Summary
POST   /api/summaries/generate
GET    /api/summaries/:patientId
PATCH  /api/summaries/:id

Doctor
GET    /api/doctor/queue
GET    /api/doctor/patients/:id
POST   /api/doctor/reviews

Triage
GET    /api/triage/alerts
POST   /api/triage/alerts/:id/acknowledge

Integration
POST   /api/integrations/abdm
POST   /api/integrations/his
```

---

# AI Service Architecture

The Node.js backend communicates with Python AI services.

```text
Express
   │
   ├── POST /history/process
   │
   ├── POST /documents/process
   │
   └── POST /summary/generate
            │
            ▼
       FastAPI Services
```

The Node.js service should not directly contain heavy ML inference logic.

---

# AI History Service

Responsibilities:

```text
Speech processing
ASR
Language detection
Clinical entity extraction
Dialogue state
Adaptive question selection
Red-flag evaluation
Structured history generation
```

---

# AI Document Service

Responsibilities:

```text
Image preprocessing
OCR
Layout detection
Clinical entity extraction
Medication extraction
Investigation extraction
Timeline generation
Abnormal-value detection
```

---

# Clinical Summary Service

Responsibilities:

```text
Structured data aggregation
Prompt construction
LLM inference
Schema validation
Summary generation
Confidence/quality metadata
```

---

# AI Guardrails

AI output must pass validation.

```text
LLM
 ↓
JSON Schema Validation
 ↓
Clinical Schema Validation
 ↓
Business Rules
 ↓
Persist
```

Never blindly store arbitrary LLM output as clinical data.

---

# ABDM & HIS Integration

Integration should be isolated behind adapters.

```text
                 MediKiosk
                     │
              Integration Layer
                     │
          ┌──────────┴──────────┐
          │                     │
     ABDM Adapter           HIS Adapter
          │                     │
         ABDM                  HIS
```

This allows development against mocks when external systems are unavailable.

---

# Mock Integration

During development:

```text
MediKiosk
   ↓
Mock ABDM
   ↓
FHIR-like payload
```

and:

```text
MediKiosk
   ↓
Mock HIS
   ↓
Patient Record
```

The production adapters can later replace the mocks without changing the rest of the application.

---

# Development Workflow

Development should proceed in dependency order.

```text
Requirements
     ↓
Clinical Schema
     ↓
Database
     ↓
API Contracts
     ↓
Frontend Foundation
     ↓
Backend Foundation
     ↓
AI Services
     ↓
Doctor Dashboard
     ↓
Integration
     ↓
Testing
     ↓
Deployment
```

---

# Team Responsibilities

For a six-person team:

## Developer 1 — Kiosk Frontend

Responsibilities:

* Next.js
* TypeScript
* Patient UI
* Touch interaction
* Voice UI
* Accessibility
* Patient journey

---

## Developer 2 — Backend & Supabase

Responsibilities:

* Express
* TypeScript
* Supabase
* PostgreSQL
* Authentication
* RLS
* Storage
* Consent
* Core APIs

---

## Developer 3 — Doctor Dashboard & Integrations

Responsibilities:

* Doctor portal
* OPD queue
* Summary review
* HIS adapter
* ABDM adapter
* Notifications

---

## Developer 4 — DevOps, Security & QA

Responsibilities:

* Docker
* CI/CD
* Deployment
* Monitoring
* Logging
* Security
* Testing
* API documentation

---

## Developer 5 — Conversational AI

Responsibilities:

* ASR
* Dialogue manager
* Clinical ontology
* Adaptive questioning
* History extraction
* Red-flag engine
* AYUSH questionnaire

---

## Developer 6 — Document AI & Summarization

Responsibilities:

* OCR
* Image preprocessing
* Clinical entity extraction
* Medical timeline
* Investigation extraction
* Abnormal-value detection
* Clinical summarization
* AI evaluation

---

# Development Phases

## Phase 1 — Foundation

* Repository setup
* Monorepo setup
* Next.js applications
* Express API
* FastAPI services
* Supabase project
* Database schema
* Authentication
* Environment configuration
* Docker setup

## Phase 2 — Patient Intake

* Patient registration
* Language selection
* Consent
* Session management
* Kiosk UI
* Basic touch-based history

## Phase 3 — Conversational AI

* ASR
* Voice interaction
* Clinical ontology
* Dialogue manager
* Adaptive questioning
* Structured history
* Red-flag detection

## Phase 4 — Document AI

* Upload
* Image processing
* OCR
* Entity extraction
* Timeline
* Investigation processing

## Phase 5 — Summary

* Summary generation
* Schema validation
* Doctor review
* Editing
* Confirmation

## Phase 6 — Doctor Portal

* Queue
* Patient records
* Clinical summary
* Timeline
* Documents
* AI flags
* Doctor review

## Phase 7 — Integration

* Mock HIS
* ABDM adapter
* Integration testing
* FHIR-compatible data structures where applicable

## Phase 8 — Hardening

* Security
* Performance
* AI evaluation
* Error handling
* Monitoring
* Accessibility
* Deployment

---

# Testing Strategy

Testing is divided into five levels.

## Unit Tests

Test:

* Clinical rules
* Data validation
* Utilities
* React components
* API services

## Integration Tests

Test:

```text
Frontend → API → Supabase
API → AI service
API → Storage
API → Integration adapters
```

## End-to-End Tests

Test the complete journey:

```text
Patient
 ↓
Registration
 ↓
Consent
 ↓
History
 ↓
Document
 ↓
Summary
 ↓
Doctor
 ↓
Review
```

## AI Tests

Test:

* ASR
* OCR
* Entity extraction
* Red flags
* Summary generation

## Security Tests

Test:

* Unauthorized access
* Role escalation
* RLS
* Expired sessions
* Invalid tokens
* File access
* API abuse

---

# AI Evaluation

AI functionality must be evaluated independently from the application.

Recommended metrics:

## ASR

* Word Error Rate
* Language accuracy

## OCR

* Character accuracy
* Field extraction accuracy

## Entity Extraction

* Precision
* Recall
* F1

## Red-Flag Detection

Prioritize:

* Recall
* False-negative rate

## Summary

Evaluate:

* Completeness
* Factual consistency
* Unsupported information
* Hallucination rate
* Physician usefulness

---

# AI Dataset

Create an anonymized/synthetic evaluation dataset containing:

```text
Patient conversations
Medical documents
Expected clinical entities
Expected history sections
Expected red-flag labels
Expected summary facts
```

For an SIH prototype, a manually validated synthetic dataset can be used to demonstrate the evaluation methodology.

---

# Security

MediKiosk handles sensitive healthcare information.

Security requirements include:

* HTTPS
* Authentication
* Authorization
* Supabase RLS
* Private storage buckets
* Signed file URLs
* Input validation
* Rate limiting
* Audit logging
* Secure session termination
* Minimal data retention
* Secrets management
* No credentials committed to Git
* Secure AI-service communication

---

# Data Retention

Temporary processing data should have a defined lifecycle.

Example:

```text
Raw upload
    ↓
Processing
    ↓
Extracted information
    ↓
Validated record
    ↓
Temporary artifacts removed according to retention policy
```

Retention requirements should be configurable rather than hard-coded.

---

# Deployment

The system should be containerized.

```text
Docker Compose
│
├── kiosk
├── doctor
├── admin
├── api
├── ai-history
├── ai-documents
└── reverse-proxy
```

Supabase can remain a managed external service.

---

# Production Architecture

```text
                    Internet / Hospital Network
                              │
                              ▼
                         Reverse Proxy
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
            Kiosk           Doctor          Admin
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                           Express
                              │
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
           Supabase       AI Services     Integrations
                              │              │
                       ┌──────┴──────┐     ABDM
                       │             │     HIS
                      OCR           LLM
                      ASR
```

---

# Environment Variables

Create `.env.local` / `.env` files locally.

Never commit secrets.

Example:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Backend
API_BASE_URL=
API_PORT=

# AI
AI_HISTORY_URL=
AI_DOCUMENT_URL=

# LLM
LLM_API_KEY=
LLM_MODEL=

# ASR
ASR_PROVIDER=
ASR_API_KEY=

# Storage
SUPABASE_STORAGE_BUCKET=

# Observability
SENTRY_DSN=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=
```

Production secrets should be managed by the deployment platform or secret manager.

---

# Getting Started

## Prerequisites

Install:

* Node.js
* pnpm
* Python
* Docker
* Git

Create a Supabase project.

---

## Clone Repository

```bash
git clone <repository-url>
cd medikiosk
```

---

## Install Dependencies

```bash
pnpm install
```

---

## Configure Environment

Create the required environment files:

```text
apps/kiosk/.env.local
apps/doctor/.env.local
services/api/.env
services/ai-history/.env
services/ai-documents/.env
```

Populate them using the project's environment template.

---

## Run Database Migrations

```bash
supabase db push
```

Or use the project's migration workflow.

---

## Start Development

```bash
pnpm dev
```

Run AI services separately if required:

```bash
cd services/ai-history
uvicorn app.main:app --reload
```

```bash
cd services/ai-documents
uvicorn app.main:app --reload
```

---

# Git Workflow

Use feature branches.

```text
main
 │
 ├── develop
 │
 ├── feature/kiosk-onboarding
 ├── feature/history-engine
 ├── feature/document-ocr
 ├── feature/doctor-dashboard
 └── feature/abdm-integration
```

Recommended commit format:

```text
feat: add patient consent flow
feat: implement adaptive history questions
fix: prevent duplicate document uploads
refactor: extract clinical schema
test: add red flag detection tests
docs: update API architecture
```

---

# Pull Request Requirements

Every PR should include:

* Description
* Screenshots where applicable
* Tests
* API changes
* Database migration if applicable
* Environment variable changes if applicable
* Security considerations
* Breaking changes

No direct pushes to `main`.

---

# Coding Standards

## TypeScript

Use strict TypeScript.

Avoid:

```typescript
const data: any = ...
```

Prefer:

```typescript
const data: ClinicalHistory = ...
```

## Validation

Validate external input using Zod or equivalent schema validation.

## React

Prefer:

* Reusable components
* Feature-based organization
* Server/client boundaries intentionally
* Typed API responses
* Accessible controls

## Backend

Keep:

```text
Controller
   ↓
Service
   ↓
Repository
   ↓
Database
```

rather than putting all business logic inside route handlers.

## AI Services

Separate:

```text
Model
Pipeline
Prompt
Schema
Validation
Evaluation
```

---

# Definition of Done

A feature is considered complete only when:

* [ ] Code is implemented
* [ ] TypeScript/type checks pass
* [ ] Unit tests exist where appropriate
* [ ] Integration tests exist where appropriate
* [ ] Error handling exists
* [ ] Authorization is implemented
* [ ] Database migrations are included
* [ ] API documentation is updated
* [ ] UI is responsive/accessible where applicable
* [ ] Logs are meaningful
* [ ] No secrets are committed
* [ ] PR is reviewed
* [ ] Feature works in the integrated application

---

# MVP Scope

The first working demonstration should focus on:

```text
✓ Patient registration
✓ Hindi + English
✓ Consent
✓ Touch-based history
✓ Voice input
✓ ASR
✓ Adaptive questioning
✓ Structured history
✓ Basic red-flag detection
✓ Document upload
✓ OCR
✓ Clinical entity extraction
✓ Medical timeline
✓ AI summary
✓ Doctor dashboard
✓ Doctor editing
✓ Supabase database
✓ Authentication
✓ Audit logging
✓ Docker deployment
```

---

# Features Beyond MVP

The following should be treated as subsequent iterations:

```text
○ Additional Indian languages
○ Advanced handwritten OCR
○ Full ABDM production integration
○ Live HIS integration
○ Advanced drug interaction analysis
○ Offline-first kiosk operation
○ Multi-kiosk orchestration
○ Advanced analytics
○ More AYUSH workflows
○ Advanced clinical decision support
```

---

# Important Clinical Safety Principles

MediKiosk is an **AI-assisted information collection system**.

It must not be presented as an autonomous diagnostic or treatment system.

The architecture follows these principles:

### 1. AI assists; physicians decide

The doctor remains responsible for reviewing and confirming clinical information.

### 2. Structured data over free-form AI output

Clinical information should be converted into validated schemas.

### 3. Rules for critical safety checks

High-risk red-flag detection should not depend exclusively on an LLM.

### 4. Source traceability

Extracted information should be traceable back to:

* Patient answer
* Document
* Document page
* AI extraction
* Doctor modification

### 5. Human verification

AI-generated summaries must be editable and verifiable.

### 6. Consent first

Patient information should not be processed or shared without the appropriate consent workflow.

### 7. Minimum necessary data

Only collect and retain information required for the intended clinical workflow.

---

# Architectural Principle

The central design principle of MediKiosk is:

```text
                PATIENT
                   │
                   ▼
          Capture Information
                   │
       ┌───────────┴───────────┐
       │                       │
     Voice                    Touch
       │                       │
       └───────────┬───────────┘
                   ▼
          Structured Clinical
               Information
                   │
          ┌────────┴────────┐
          │                 │
      Documents          Symptoms
          │                 │
          ▼                 ▼
        OCR              History
          │                 │
          └────────┬────────┘
                   ▼
             Validation
                   │
                   ▼
             AI Summary
                   │
                   ▼
            Physician Review
                   │
             ┌─────┴─────┐
             │           │
           Edit        Confirm
             │           │
             └─────┬─────┘
                   ▼
             Clinical Record
                   │
             ┌─────┴─────┐
             │           │
            HIS         ABDM
```

The AI layer should therefore be treated as an **intelligent processing layer around a strongly typed clinical data model**, rather than as the application's source of truth.

---

# Project Status

> 🚧 **Under Development**

Current development should prioritize:

1. Architecture
2. Clinical schema
3. Supabase database
4. API contracts
5. Patient kiosk
6. Conversational AI
7. Document AI
8. Doctor dashboard
9. Integration
10. Security and evaluation

---

# License

Add the project's chosen license before public release.

---

# Disclaimer

MediKiosk is a software engineering and AI research/prototype project intended to assist clinical information collection and workflow efficiency.

It should not be used as a substitute for professional medical judgment, diagnosis, emergency care, or treatment decisions.

All AI-generated clinical information must be appropriately reviewed by qualified healthcare professionals before being treated as part of a clinical record.
