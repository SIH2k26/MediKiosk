-- =============================================================================
-- MediKiosk — Kiosk Intake Enhancements
-- Migration: 002_kiosk_intake.sql
-- =============================================================================
-- Adds:
--   1. OPD token generation + inactivity tracking on patient_sessions
--   2. OTP verification storage (mock SMS in development)
--   3. Versioned multilingual consent documents
--   4. DECLINED consent status
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PATIENT SESSIONS — OPD token + inactivity tracking
-- -----------------------------------------------------------------------------

ALTER TABLE patient_sessions ADD COLUMN IF NOT EXISTS opd_token TEXT UNIQUE;
ALTER TABLE patient_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN patient_sessions.opd_token IS 'OPD queue token issued at session start (e.g. OPD-20260829-0042).';
COMMENT ON COLUMN patient_sessions.last_activity_at IS 'Updated by kiosk heartbeat. Used to expire abandoned sessions.';

CREATE SEQUENCE IF NOT EXISTS opd_token_seq;

-- Generates a sequential daily-prefixed OPD token.
CREATE OR REPLACE FUNCTION generate_opd_token()
RETURNS TEXT AS $$
  SELECT 'OPD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('opd_token_seq')::TEXT, 4, '0');
$$ LANGUAGE sql VOLATILE;

-- Marks ACTIVE sessions as EXPIRED when past expiry or inactive > 30 minutes.
-- Can be invoked by a scheduled job (pg_cron / Supabase scheduled function).
CREATE OR REPLACE FUNCTION expire_stale_sessions()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE patient_sessions
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE'
    AND (expires_at < NOW() OR last_activity_at < NOW() - INTERVAL '30 minutes');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2. OTP VERIFICATIONS (optional phone verification during onboarding)
-- -----------------------------------------------------------------------------

CREATE TABLE otp_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code        TEXT NOT NULL,                -- Prototype: plain 6-digit code. Hash in production.
  attempts    INTEGER NOT NULL DEFAULT 0,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE otp_verifications IS 'One-time passwords for optional kiosk phone verification. SMS delivery is mocked in development.';

CREATE INDEX idx_otp_phone ON otp_verifications(phone);
CREATE INDEX idx_otp_expires_at ON otp_verifications(expires_at);

ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
-- No policies: accessible only via service-role API.

-- -----------------------------------------------------------------------------
-- 3. CONSENT VERSIONS (multilingual, versioned consent documents)
-- -----------------------------------------------------------------------------

CREATE TABLE consent_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version     TEXT NOT NULL,
  language    language_code NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  audio_url   TEXT,                          -- Optional pre-recorded audio explanation
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(version, language)
);

COMMENT ON TABLE consent_versions IS 'Versioned consent document texts per language. Patients always consent to a specific version.';

CREATE INDEX idx_consent_versions_active ON consent_versions(language, is_active);

ALTER TABLE consent_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consent versions are publicly readable"
  ON consent_versions FOR SELECT USING (true);

-- Seed consent v1.0 (English + Hindi)
INSERT INTO consent_versions (version, language, title, body) VALUES
('1.0', 'en', 'Consent Form',
'1. Purpose of Collection:
MediKiosk collects your symptoms and digitizes your medical documents to generate a structured clinical draft history. This helps the hospital reduce consultation queue wait times.

2. Artificial Intelligence Processing:
Our clinical AI service extracts medical text from your uploads and transcribes your voice recordings. The AI will formulate a chronological medical timeline for physician review.

3. Human Verification & Control:
All AI output is treated as a clinical draft. It is NOT an autonomous medical diagnosis. Your consulting physician will review, edit, and confirm all details before adding them to your official EHR.

4. Your Rights:
You may withdraw (revoke) your consent at any time by informing hospital staff. All access to your information is recorded in an audit log.

By accepting below, you grant permission to MediKiosk to store and process your intake information.'),
('1.0', 'hi', 'सहमति पत्र',
'1. जानकारी संग्रह का उद्देश्य:
मेडिकियॉस्क आपकी बीमारी के लक्षण और आपके पुराने मेडिकल दस्तावेजों को स्कैन करके डिजिटल रूप में एकत्रित करता है। इसका मुख्य उद्देश्य डॉक्टर के कमरे में आपके समय की बचत करना है।

2. आर्टिफिशियल इंटेलिजेंस (AI) प्रोसेसिंग:
हमारा AI सिस्टम आपके स्कैन किए गए पर्चे, जांच रिपोर्ट और आपके द्वारा बोली गई बातों का अनुवाद करके एक संक्षिप्त विवरण तैयार करेगा।

3. डॉक्टर द्वारा जांच और नियंत्रण:
AI द्वारा बनाई गई रिपोर्ट केवल एक ड्राफ्ट/प्रारूप है। यह कोई अंतिम मेडिकल जांच या इलाज का पर्चा नहीं है। आपके डॉक्टर इस रिपोर्ट को पढ़कर, बदल कर और सत्यापित करके ही आपके मुख्य हॉस्पिटल रिकॉर्ड में शामिल करेंगे।

4. आपके अधिकार:
आप किसी भी समय अस्पताल कर्मचारियों को सूचित करके अपनी सहमति वापस ले सकते हैं। आपकी जानकारी तक हर पहुंच ऑडिट लॉग में दर्ज की जाती है।

नीचे स्वीकार करके आप मेडिकियॉस्क को अपनी स्वास्थ्य संबंधी जानकारी सुरक्षित रखने की सहमति प्रदान करते हैं।');

-- -----------------------------------------------------------------------------
-- 4. CONSENT STATUS — add DECLINED (explicit rejection, distinct from REVOKED)
-- -----------------------------------------------------------------------------

ALTER TYPE consent_status ADD VALUE IF NOT EXISTS 'DECLINED';
