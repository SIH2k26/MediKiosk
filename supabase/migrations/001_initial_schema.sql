-- =============================================================================
-- MediKiosk — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================
-- This schema creates all core tables for the MediKiosk platform.
-- Row Level Security (RLS) is enabled on all patient-related tables.
-- All timestamps are stored in UTC.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for future semantic search
-- Note: uuid-ossp extension not needed - using gen_random_uuid() instead

-- =============================================================================
-- TYPES / ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('PATIENT', 'DOCTOR', 'TRIAGE_STAFF', 'ADMIN');
CREATE TYPE risk_level AS ENUM ('NORMAL', 'WARNING', 'HIGH_PRIORITY', 'EMERGENCY');
CREATE TYPE language_code AS ENUM ('en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa');
CREATE TYPE document_type AS ENUM ('PRESCRIPTION', 'LAB_REPORT', 'DISCHARGE_SUMMARY', 'IMAGING_REPORT', 'PROCEDURE_RECORD', 'OTHER');
CREATE TYPE document_status AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', 'REQUIRES_REVIEW');
CREATE TYPE consent_status AS ENUM ('PENDING', 'GRANTED', 'REVOKED');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED', 'EXPIRED');
CREATE TYPE summary_status AS ENUM ('GENERATING', 'READY', 'DOCTOR_REVIEWING', 'CONFIRMED', 'REJECTED');
CREATE TYPE review_action AS ENUM ('ACCEPT', 'MODIFY', 'REJECT');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE history_section_type AS ENUM (
  'CHIEF_COMPLAINT', 'HPI', 'PAST_MEDICAL_HISTORY', 'PAST_SURGICAL_HISTORY',
  'MEDICATIONS', 'ALLERGIES', 'FAMILY_HISTORY', 'PERSONAL_HISTORY',
  'REVIEW_OF_SYSTEMS', 'AYUSH'
);
CREATE TYPE answer_type AS ENUM ('VOICE', 'TOUCH', 'TEXT');
CREATE TYPE entity_type AS ENUM (
  'MEDICATION', 'INVESTIGATION', 'DIAGNOSIS', 'SURGERY',
  'ALLERGY', 'DATE', 'DOCTOR', 'HOSPITAL', 'OTHER'
);
CREATE TYPE timeline_event_type AS ENUM (
  'DIAGNOSIS', 'SURGERY', 'MEDICATION_START', 'MEDICATION_STOP',
  'INVESTIGATION', 'HOSPITALIZATION', 'CONSULTATION', 'OTHER'
);

-- =============================================================================
-- PROFILES (extends Supabase auth.users)
-- =============================================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'PATIENT',
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE profiles IS 'Extended user profiles linked to Supabase Auth users.';

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =============================================================================
-- PATIENTS
-- =============================================================================

CREATE TABLE patients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  abha_id              TEXT UNIQUE,                          -- Ayushman Bharat Health Account
  uhid                 TEXT,                                 -- Hospital-specific ID
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  date_of_birth        DATE,
  age                  INTEGER CHECK (age >= 0 AND age <= 150),
  gender               gender,
  phone                TEXT,
  email                TEXT,
  address              JSONB,                                -- PatientAddress object
  preferred_language   language_code NOT NULL DEFAULT 'hi',
  is_anonymous         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE patients IS 'Patient demographic records. Linked to profiles for registered users.';
COMMENT ON COLUMN patients.is_anonymous IS 'Walk-in kiosk patients without prior registration.';

CREATE INDEX idx_patients_abha_id ON patients(abha_id) WHERE abha_id IS NOT NULL;
CREATE INDEX idx_patients_phone ON patients(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

-- =============================================================================
-- PATIENT SESSIONS
-- =============================================================================

CREATE TABLE patient_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kiosk_id      TEXT,                                       -- Physical kiosk identifier
  status        session_status NOT NULL DEFAULT 'ACTIVE',
  language      language_code NOT NULL DEFAULT 'hi',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4 hours'),
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE patient_sessions IS 'Kiosk intake sessions. Each visit creates a new session.';

CREATE INDEX idx_sessions_patient_id ON patient_sessions(patient_id);
CREATE INDEX idx_sessions_status ON patient_sessions(status);
CREATE INDEX idx_sessions_started_at ON patient_sessions(started_at DESC);

-- =============================================================================
-- CONSENTS
-- =============================================================================

CREATE TABLE consents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id              UUID NOT NULL REFERENCES patient_sessions(id) ON DELETE CASCADE,
  status                  consent_status NOT NULL DEFAULT 'PENDING',
  consent_version         TEXT NOT NULL,                    -- Version of consent document
  granted_at              TIMESTAMPTZ,
  revoked_at              TIMESTAMPTZ,
  ip_address              TEXT,
  audio_confirmation_url  TEXT,                             -- Supabase Storage URL
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE consents IS 'Patient consent records. Must be GRANTED before processing begins.';

CREATE INDEX idx_consents_patient_id ON consents(patient_id);
CREATE INDEX idx_consents_session_id ON consents(session_id);
CREATE INDEX idx_consents_status ON consents(status);

-- =============================================================================
-- CLINICAL HISTORIES
-- =============================================================================

CREATE TABLE clinical_histories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES patient_sessions(id) ON DELETE CASCADE,
  ayush_mode      BOOLEAN NOT NULL DEFAULT FALSE,           -- AYUSH vs standard clinical
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)
);

COMMENT ON TABLE clinical_histories IS 'Root record for a patient clinical history intake. One per session.';

CREATE INDEX idx_histories_patient_id ON clinical_histories(patient_id);
CREATE INDEX idx_histories_session_id ON clinical_histories(session_id);

-- =============================================================================
-- HISTORY SECTIONS
-- =============================================================================

CREATE TABLE history_sections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id     UUID NOT NULL REFERENCES clinical_histories(id) ON DELETE CASCADE,
  section_type   history_section_type NOT NULL,
  is_complete    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(history_id, section_type)
);

COMMENT ON TABLE history_sections IS 'Individual sections of a clinical history (e.g., Chief Complaint, HPI, Medications).';

CREATE INDEX idx_sections_history_id ON history_sections(history_id);

-- =============================================================================
-- HISTORY ANSWERS
-- =============================================================================

CREATE TABLE history_answers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id        UUID NOT NULL REFERENCES history_sections(id) ON DELETE CASCADE,
  question_id       TEXT NOT NULL,
  question_text     TEXT NOT NULL,
  answer_type       answer_type NOT NULL,
  raw_answer        TEXT NOT NULL,                          -- Original voice transcript or touch selection
  processed_answer  TEXT,                                   -- After NLP processing
  audio_url         TEXT,                                   -- Supabase Storage URL for voice recording
  confidence        NUMERIC(4, 3) CHECK (confidence >= 0 AND confidence <= 1),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE history_answers IS 'Individual question-answer pairs. Source of truth for all history data.';
COMMENT ON COLUMN history_answers.audio_url IS 'Stored voice recording. Subject to retention policy.';

CREATE INDEX idx_answers_section_id ON history_answers(section_id);

-- =============================================================================
-- MEDICAL DOCUMENTS
-- =============================================================================

CREATE TABLE documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id          UUID NOT NULL REFERENCES patient_sessions(id) ON DELETE CASCADE,
  type                document_type NOT NULL DEFAULT 'OTHER',
  status              document_status NOT NULL DEFAULT 'UPLOADED',
  original_file_name  TEXT NOT NULL,
  storage_url         TEXT NOT NULL,                        -- Supabase Storage path
  mime_type           TEXT NOT NULL,
  file_size_bytes     BIGINT NOT NULL,
  page_count          INTEGER,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ,
  ocr_text            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'Medical documents uploaded by patients during kiosk intake.';

CREATE INDEX idx_documents_patient_id ON documents(patient_id);
CREATE INDEX idx_documents_session_id ON documents(session_id);
CREATE INDEX idx_documents_status ON documents(status);

-- =============================================================================
-- DOCUMENT PAGES
-- =============================================================================

CREATE TABLE document_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number  INTEGER NOT NULL,
  storage_url  TEXT NOT NULL,
  ocr_text     TEXT,
  ocr_confidence NUMERIC(4, 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_pages_document_id ON document_pages(document_id);

-- =============================================================================
-- EXTRACTED ENTITIES
-- =============================================================================

CREATE TABLE extracted_entities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number       INTEGER,
  entity_type       entity_type NOT NULL,
  value             TEXT NOT NULL,
  normalized_value  TEXT,
  confidence        NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  bounding_box      JSONB,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE extracted_entities IS 'Clinical entities extracted from documents by AI. Traceable to source document and page.';

CREATE INDEX idx_entities_document_id ON extracted_entities(document_id);
CREATE INDEX idx_entities_type ON extracted_entities(entity_type);

-- =============================================================================
-- INVESTIGATIONS (Lab Results)
-- =============================================================================

CREATE TABLE investigations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  value              TEXT,
  unit               TEXT,
  reference_range    JSONB,
  status             TEXT CHECK (status IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'UNKNOWN')),
  test_date          DATE,
  laboratory         TEXT,
  is_abnormal        BOOLEAN,
  notes              TEXT,
  extracted_by_ai    BOOLEAN NOT NULL DEFAULT TRUE,
  confidence         NUMERIC(4, 3),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE investigations IS 'Lab investigation results. Extracted from documents or entered by patient.';

CREATE INDEX idx_investigations_patient_id ON investigations(patient_id);
CREATE INDEX idx_investigations_test_date ON investigations(test_date DESC);

-- =============================================================================
-- MEDICATIONS
-- =============================================================================

CREATE TABLE medications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  generic_name       TEXT,
  dose               TEXT,
  frequency          TEXT,
  route              TEXT,
  start_date         DATE,
  end_date           DATE,
  prescribed_by      TEXT,
  is_currently_taking BOOLEAN NOT NULL DEFAULT TRUE,
  extracted_by_ai    BOOLEAN NOT NULL DEFAULT TRUE,
  confidence         NUMERIC(4, 3),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medications_patient_id ON medications(patient_id);

-- =============================================================================
-- ALLERGIES
-- =============================================================================

CREATE TABLE allergies (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  substance          TEXT NOT NULL,
  type               TEXT CHECK (type IN ('DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER')),
  reaction           TEXT,
  severity           TEXT CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE', 'ANAPHYLAXIS')),
  extracted_by_ai    BOOLEAN NOT NULL DEFAULT TRUE,
  confidence         NUMERIC(4, 3),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_allergies_patient_id ON allergies(patient_id);

-- =============================================================================
-- PROCEDURES / SURGERIES
-- =============================================================================

CREATE TABLE procedures (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  procedure_name     TEXT NOT NULL,
  year               INTEGER,
  hospital           TEXT,
  notes              TEXT,
  extracted_by_ai    BOOLEAN NOT NULL DEFAULT TRUE,
  confidence         NUMERIC(4, 3),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_procedures_patient_id ON procedures(patient_id);

-- =============================================================================
-- MEDICAL TIMELINE
-- =============================================================================

CREATE TABLE timeline_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  event_date         DATE,
  event_year         INTEGER,
  event_type         timeline_event_type NOT NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source_answer_id   UUID REFERENCES history_answers(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_patient_id ON timeline_events(patient_id);
CREATE INDEX idx_timeline_event_date ON timeline_events(event_date DESC NULLS LAST);

-- =============================================================================
-- CLINICAL SUMMARIES
-- =============================================================================

CREATE TABLE clinical_summaries (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id                  UUID NOT NULL REFERENCES patient_sessions(id) ON DELETE CASCADE,
  status                      summary_status NOT NULL DEFAULT 'GENERATING',
  risk_level                  risk_level NOT NULL DEFAULT 'NORMAL',
  red_flags                   JSONB NOT NULL DEFAULT '[]',

  -- Summary sections (physician-readable text)
  chief_complaint_summary     TEXT,
  hpi_narrative               TEXT,
  past_history_summary        TEXT,
  medication_summary          TEXT,
  allergy_summary             TEXT,
  investigation_summary       TEXT,
  timeline_summary            TEXT,
  systems_review              TEXT,

  -- AI metadata
  ai_model                    TEXT,
  generation_prompt_version   TEXT,
  generated_at                TIMESTAMPTZ,
  confidence_score            NUMERIC(4, 3),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE clinical_summaries IS 'AI-generated clinical summaries. Must be reviewed and confirmed by a physician before use.';
COMMENT ON COLUMN clinical_summaries.red_flags IS 'Array of RedFlag objects detected during history taking.';

CREATE INDEX idx_summaries_patient_id ON clinical_summaries(patient_id);
CREATE INDEX idx_summaries_session_id ON clinical_summaries(session_id);
CREATE INDEX idx_summaries_status ON clinical_summaries(status);
CREATE INDEX idx_summaries_risk_level ON clinical_summaries(risk_level);

-- =============================================================================
-- DOCTOR REVIEWS
-- =============================================================================

CREATE TABLE doctor_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id       UUID NOT NULL REFERENCES clinical_summaries(id) ON DELETE CASCADE,
  doctor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action           review_action NOT NULL,

  -- Preserve original AI output for audit trail
  original_summary JSONB NOT NULL,

  -- Doctor modifications
  modifications    JSONB,          -- Array of SummaryModification objects
  final_notes      TEXT,
  confirmed_at     TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE doctor_reviews IS 'Doctor review of AI-generated summaries. Original AI output always preserved for audit.';

CREATE INDEX idx_reviews_summary_id ON doctor_reviews(summary_id);
CREATE INDEX idx_reviews_doctor_id ON doctor_reviews(doctor_id);

-- =============================================================================
-- TRIAGE ALERTS
-- =============================================================================

CREATE TABLE triage_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id        UUID NOT NULL REFERENCES patient_sessions(id) ON DELETE CASCADE,
  risk_level        risk_level NOT NULL,
  red_flags         JSONB NOT NULL DEFAULT '[]',
  is_acknowledged   BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE triage_alerts IS 'Triage alerts generated from red-flag detection. Staff must acknowledge HIGH_PRIORITY and EMERGENCY alerts.';

CREATE INDEX idx_triage_alerts_session_id ON triage_alerts(session_id);
CREATE INDEX idx_triage_alerts_risk_level ON triage_alerts(risk_level);
CREATE INDEX idx_triage_alerts_is_acknowledged ON triage_alerts(is_acknowledged);
CREATE INDEX idx_triage_alerts_created_at ON triage_alerts(created_at DESC);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================

CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role     user_role,
  patient_id     UUID REFERENCES patients(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  resource_type  TEXT,
  resource_id    UUID,
  details        JSONB,
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all significant actions in the system.';

-- Audit logs are append-only — no UPDATE or DELETE allowed via RLS
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_patient_id ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_patients_updated_at
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_sessions_updated_at
  BEFORE UPDATE ON patient_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_consents_updated_at
  BEFORE UPDATE ON consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_histories_updated_at
  BEFORE UPDATE ON clinical_histories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_sections_updated_at
  BEFORE UPDATE ON history_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_investigations_updated_at
  BEFORE UPDATE ON investigations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_medications_updated_at
  BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_allergies_updated_at
  BEFORE UPDATE ON allergies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_procedures_updated_at
  BEFORE UPDATE ON procedures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_summaries_updated_at
  BEFORE UPDATE ON clinical_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON doctor_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all patient-sensitive tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS Helper: get current user's role from profiles table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- PROFILES policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (get_user_role() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- PATIENTS policies
-- ---------------------------------------------------------------------------
-- Patients can view their own record
CREATE POLICY "Patients can view their own record"
  ON patients FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Doctors and staff can view all patients
CREATE POLICY "Medical staff can view patients"
  ON patients FOR SELECT
  USING (get_user_role() IN ('DOCTOR', 'TRIAGE_STAFF', 'ADMIN'));

-- Patients can be created without auth (kiosk walk-in)
CREATE POLICY "Allow patient creation"
  ON patients FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- CLINICAL SUMMARIES policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Doctors can view summaries"
  ON clinical_summaries FOR SELECT
  USING (get_user_role() IN ('DOCTOR', 'TRIAGE_STAFF', 'ADMIN'));

CREATE POLICY "Doctors can update summaries"
  ON clinical_summaries FOR UPDATE
  USING (get_user_role() = 'DOCTOR');

-- ---------------------------------------------------------------------------
-- DOCTOR REVIEWS policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Doctors can create reviews"
  ON doctor_reviews FOR INSERT
  WITH CHECK (get_user_role() = 'DOCTOR');

CREATE POLICY "Doctors can view reviews"
  ON doctor_reviews FOR SELECT
  USING (get_user_role() IN ('DOCTOR', 'ADMIN'));

-- ---------------------------------------------------------------------------
-- TRIAGE ALERTS policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Medical staff can view triage alerts"
  ON triage_alerts FOR SELECT
  USING (get_user_role() IN ('DOCTOR', 'TRIAGE_STAFF', 'ADMIN'));

CREATE POLICY "Medical staff can acknowledge triage alerts"
  ON triage_alerts FOR UPDATE
  USING (get_user_role() IN ('DOCTOR', 'TRIAGE_STAFF'));

-- ---------------------------------------------------------------------------
-- AUDIT LOGS — append-only
-- ---------------------------------------------------------------------------
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (get_user_role() = 'ADMIN');

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE on audit logs (enforced by absence of policies)
