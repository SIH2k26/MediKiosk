-- =============================================================================
-- MediKiosk — Seed Data for Development
-- Migration: 001_seed.sql
-- =============================================================================
-- Synthetic data for development and testing.
-- Do NOT use in production.
-- =============================================================================

-- Note: Supabase auth.users must be created via the Auth API, not directly.
-- This seed assumes you have created the following test users via Supabase Dashboard:
--   doctor@medikiosk.dev    (role: DOCTOR)
--   triage@medikiosk.dev    (role: TRIAGE_STAFF)
--   admin@medikiosk.dev     (role: ADMIN)
--
-- After creating them in Supabase Auth, update the UUIDs below.

-- Placeholder UUIDs — replace with actual Supabase Auth user IDs
DO $$
DECLARE
  doctor_auth_id    UUID := '00000000-0000-0000-0000-000000000001';
  triage_auth_id    UUID := '00000000-0000-0000-0000-000000000002';
  admin_auth_id     UUID := '00000000-0000-0000-0000-000000000003';

  doctor_profile_id UUID;
  patient1_id       UUID;
  session1_id       UUID;
BEGIN

  -- ---------------------------------------------------------------------
  -- Profiles for staff users
  -- ---------------------------------------------------------------------
  INSERT INTO profiles (user_id, role, full_name, email)
  VALUES
    (doctor_auth_id, 'DOCTOR', 'Dr. Priya Sharma', 'doctor@medikiosk.dev'),
    (triage_auth_id, 'TRIAGE_STAFF', 'Nurse Rahul Kumar', 'triage@medikiosk.dev'),
    (admin_auth_id, 'ADMIN', 'Admin User', 'admin@medikiosk.dev')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO doctor_profile_id FROM profiles WHERE user_id = doctor_auth_id;

  -- ---------------------------------------------------------------------
  -- Sample Patient (anonymous kiosk walk-in)
  -- ---------------------------------------------------------------------
  INSERT INTO patients (id, first_name, last_name, age, gender, preferred_language, is_anonymous)
  VALUES
    (uuid_generate_v4(), 'Ramesh', 'Gupta', 52, 'MALE', 'hi', TRUE)
  RETURNING id INTO patient1_id;

  -- ---------------------------------------------------------------------
  -- Patient Session
  -- ---------------------------------------------------------------------
  INSERT INTO patient_sessions (id, patient_id, status, language, kiosk_id)
  VALUES
    (uuid_generate_v4(), patient1_id, 'ACTIVE', 'hi', 'KIOSK-001')
  RETURNING id INTO session1_id;

  -- ---------------------------------------------------------------------
  -- Consent
  -- ---------------------------------------------------------------------
  INSERT INTO consents (patient_id, session_id, status, consent_version, granted_at)
  VALUES
    (patient1_id, session1_id, 'GRANTED', '1.0', NOW());

  -- Audit log for seed
  INSERT INTO audit_logs (actor_id, action, details)
  VALUES
    (NULL, 'DATABASE_SEEDED', '{"environment": "development", "seed_version": "001"}');

END $$;
