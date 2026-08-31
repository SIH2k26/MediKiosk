-- =============================================================================
-- MediKiosk — Seed Data for Development
-- File: 001_seed.sql
-- =============================================================================
-- Synthetic data for development, testing, and hackathon demonstration.
-- =============================================================================

DO $$
DECLARE
  doctor_auth_id    UUID := '00000000-0000-0000-0000-000000000001';
  triage_auth_id    UUID := '00000000-0000-0000-0000-000000000002';
  admin_auth_id     UUID := '00000000-0000-0000-0000-000000000003';

  doctor_profile_id UUID;
  patient1_id       UUID;
  patient2_id       UUID;
  session1_id       UUID;
  session2_id       UUID;
  history1_id       UUID;
  summary1_id       UUID;
BEGIN

  -- ---------------------------------------------------------------------
  -- Staff User Profiles
  -- ---------------------------------------------------------------------
  INSERT INTO profiles (id, user_id, role, full_name, email, phone)
  VALUES
    (gen_random_uuid(), doctor_auth_id, 'DOCTOR', 'Dr. Priya Sharma (Cardiology)', 'doctor@medikiosk.dev', '+919876543210'),
    (gen_random_uuid(), triage_auth_id, 'TRIAGE_STAFF', 'Nurse Rahul Kumar (OPD Triage)', 'triage@medikiosk.dev', '+919876543211'),
    (gen_random_uuid(), admin_auth_id, 'ADMIN', 'System Administrator', 'admin@medikiosk.dev', '+919876543212')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO doctor_profile_id FROM profiles WHERE user_id = doctor_auth_id;

  -- ---------------------------------------------------------------------
  -- Sample Patient 1: Cardiac Red-Flag (Chest Pain & Diaphoresis)
  -- ---------------------------------------------------------------------
  INSERT INTO patients (id, first_name, last_name, age, gender, phone, abha_id, preferred_language, is_anonymous)
  VALUES
    ('11111111-1111-1111-1111-111111111111', 'Ramesh', 'Gupta', 58, 'MALE', '9876500001', '12345678901234', 'hi', FALSE)
  ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
  RETURNING id INTO patient1_id;

  -- Active Session with OPD Token
  INSERT INTO patient_sessions (id, patient_id, status, language, kiosk_id, opd_token)
  VALUES
    ('22222222-2222-2222-2222-222222222222', patient1_id, 'ACTIVE', 'hi', 'KIOSK-01', 'OPD-20260831-0001')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO session1_id;

  IF session1_id IS NULL THEN
    session1_id := '22222222-2222-2222-2222-222222222222';
  END IF;

  -- Consent
  INSERT INTO consents (patient_id, session_id, status, consent_version, granted_at)
  VALUES
    (patient1_id, session1_id, 'GRANTED', '1.0', NOW())
  ON CONFLICT DO NOTHING;

  -- Clinical History
  INSERT INTO clinical_histories (id, patient_id, session_id, ayush_mode, completed_at)
  VALUES
    ('33333333-3333-3333-3333-333333333333', patient1_id, session1_id, FALSE, NOW())
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO history1_id;

  IF history1_id IS NULL THEN
    history1_id := '33333333-3333-3333-3333-333333333333';
  END IF;

  -- Triage Alert: HIGH_PRIORITY (Cardiovascular)
  INSERT INTO triage_alerts (
    id, patient_id, session_id, section_type, risk_level, priority_score,
    alert_status, clinical_category, suggested_action, time_to_intervention_minutes,
    red_flags, is_acknowledged, created_at
  )
  VALUES (
    '44444444-4444-4444-4444-444444444444',
    patient1_id,
    session1_id,
    'CHIEF_COMPLAINT',
    'HIGH_PRIORITY',
    75,
    'ACTIVE',
    'CARDIAC',
    'Immediate ECG, vital signs acquisition, and urgent physician triage review.',
    15,
    '[{"type": "CHEST_PAIN_WITH_DIAPHORESIS", "description": "Severe retrosternal pressure with sweating radiating to left arm", "severity": "HIGH_PRIORITY", "requiresImmediateAttention": true}]'::jsonb,
    FALSE,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Sample Clinical Summary
  INSERT INTO clinical_summaries (
    id, patient_id, session_id, status, risk_level,
    chief_complaint_summary, hpi_narrative, past_history_summary,
    medication_summary, allergy_summary, investigation_summary, timeline_summary,
    red_flags, summary_sources
  )
  VALUES (
    '55555555-5555-5555-5555-555555555555',
    patient1_id,
    session1_id,
    'draft_ai',
    'HIGH_PRIORITY',
    'Severe retrosternal chest pain for 2 hours with profuse diaphoresis and mild dyspnea.',
    'Patient reports acute onset of heavy retrosternal pressure radiating to the left shoulder, beginning 2 hours prior to arrival. Aggravated by exertion, unresponsive to rest.',
    'Essential Hypertension (6 years), Type 2 Diabetes Mellitus (4 years).',
    'Tab Telmisartan 40mg OD, Tab Metformin 500mg BD.',
    'No known drug allergies (NKDA).',
    'Previous ECG (2025): Normal Sinus Rhythm. HbA1c (May 2026): 7.2%.',
    '2020: Diagnosed with Hypertension. 2022: Diagnosed with T2DM. 2026: Acute chest pain episode.',
    '[{"type": "CHEST_PAIN_WITH_DIAPHORESIS", "description": "Severe retrosternal pressure with sweating", "severity": "HIGH_PRIORITY", "requiresImmediateAttention": true}]'::jsonb,
    '{"source": "AI Intake Aggregation Service", "confidence": 0.94}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------
  -- Sample Patient 2: Routine Checkup / Walk-in
  -- ---------------------------------------------------------------------
  INSERT INTO patients (id, first_name, last_name, age, gender, phone, preferred_language, is_anonymous)
  VALUES
    ('66666666-6666-6666-6666-666666666666', 'Sunita', 'Devi', 42, 'FEMALE', '9876500002', 'hi', FALSE)
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO patient2_id;

  IF patient2_id IS NULL THEN
    patient2_id := '66666666-6666-6666-6666-666666666666';
  END IF;

  INSERT INTO patient_sessions (id, patient_id, status, language, kiosk_id, opd_token)
  VALUES
    ('77777777-7777-7777-7777-777777777777', patient2_id, 'ACTIVE', 'hi', 'KIOSK-02', 'OPD-20260831-0002')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------
  -- Audit Log
  -- ---------------------------------------------------------------------
  INSERT INTO audit_logs (id, actor_id, actor_role, action, details)
  VALUES
    (gen_random_uuid(), admin_auth_id, 'ADMIN', 'DATABASE_SEEDED', '{"version": "001", "environment": "development"}'::jsonb);

END $$;
