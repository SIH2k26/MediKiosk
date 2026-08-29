/**
 * MediKiosk — Database types.  MIRRORS supabase/schema.sql EXACTLY.
 *
 * ── RULES FOR THE TEAM ────────────────────────────────────────────────────
 * Do NOT redefine these in your own files. Import from '@/lib/types'.
 * If a shape here is wrong, flag it in the group chat — don't fork it locally,
 * because then two branches disagree and it breaks at runtime after the merge.
 * ──────────────────────────────────────────────────────────────────────────
 */

// ─── Enums (string unions matching the Postgres enums 1:1) ─────────────────

export const USER_ROLES = ['doctor', 'triage', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const OPD_TYPES = ['allopathic', 'ayush'] as const;
export type OpdType = (typeof OPD_TYPES)[number];

/** BCP-47 primary subtags — map to Web Speech locales via LANGUAGE_LOCALES. */
export const LANGUAGE_CODES = [
  'en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur',
] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const SESSION_STATES = [
  'created',
  'language_selected',
  'consent_granted',
  'identified',
  'history_in_progress',
  'documents_in_progress',
  'generating_summary',
  'ready_for_doctor',
  'in_consultation',
  'completed',
  'abandoned',
  'expired',
] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export const INPUT_MODES = ['voice', 'touch', 'mixed'] as const;
export type InputMode = (typeof INPUT_MODES)[number];

export const CONSENT_STATUSES = ['granted', 'denied', 'revoked'] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const DOCUMENT_TYPES = [
  'prescription', 'lab_report', 'discharge_summary', 'imaging', 'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ['uploaded', 'processing', 'completed', 'failed'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const ENTITY_TYPES = [
  'diagnosis', 'medication', 'allergy', 'investigation', 'procedure', 'symptom', 'vital',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_SOURCES = ['conversation', 'document', 'doctor'] as const;
export type EntitySource = (typeof ENTITY_SOURCES)[number];

export const ABNORMAL_FLAGS = [
  'critical_low', 'low', 'normal', 'high', 'critical_high', 'unknown',
] as const;
export type AbnormalFlag = (typeof ABNORMAL_FLAGS)[number];

export const RISK_LEVELS = ['routine', 'urgent', 'emergency'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const ALERT_STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'accepted', 'amended', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const HISTORY_SECTIONS = [
  'chief_complaint',
  'hpi',
  'past_medical',
  'past_surgical',
  'medications',
  'allergies',
  'family',
  'personal',
  'review_of_systems',
  'ayush',
] as const;
export type HistorySection = (typeof HISTORY_SECTIONS)[number];

export const SUBMISSION_STATUSES = ['pending', 'success', 'failed', 'retrying'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

// ─── Table names (import these instead of typing string literals, so a rename
//     is one edit and the compiler finds every call site) ────────────────────

export const TABLES = {
  profiles: 'profiles',
  kiosks: 'kiosks',
  patients: 'patients',
  sessions: 'intake_sessions',
  consents: 'consents',
  historyResponses: 'history_responses',
  clinicalHistory: 'clinical_history',
  ayushAssessment: 'ayush_assessment',
  documents: 'documents',
  entities: 'extracted_entities',
  investigations: 'investigations',
  timeline: 'timeline_events',
  alerts: 'triage_alerts',
  summaries: 'summaries',
  summaryReviews: 'summary_reviews',
  fhirSubmissions: 'fhir_submissions',
  auditLogs: 'audit_logs',
} as const;

/** Private Storage bucket names. Never build public URLs for these. */
export const BUCKETS = {
  documents: 'medical-documents',
  audio: 'session-audio',
} as const;

// ─── Row types ─────────────────────────────────────────────────────────────

type Uuid = string;
type Timestamp = string; // ISO 8601
type DateOnly = string;  // YYYY-MM-DD
type Json = Record<string, unknown>;

export interface Profile {
  id: Uuid;
  role: UserRole;
  full_name: string;
  department: string | null;
  registration_no: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Kiosk {
  id: Uuid;
  code: string;
  location: string | null;
  opd_type: OpdType;
  department: string | null;
  is_active: boolean;
  last_seen_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Patient {
  id: Uuid;
  abha_number: string | null;
  abha_address: string | null;
  full_name: string;
  date_of_birth: DateOnly | null;
  age_years: number | null;
  gender: 'male' | 'female' | 'other' | 'undisclosed' | null;
  phone: string | null;
  address_line: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  preferred_language: LanguageCode;
  is_anonymous: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface IntakeSession {
  id: Uuid;
  patient_id: Uuid | null;
  kiosk_id: Uuid | null;
  token_number: string;
  opd_type: OpdType;
  department: string | null;
  state: SessionState;
  language: LanguageCode;
  input_mode: InputMode;
  risk_level: RiskLevel;
  last_activity_at: Timestamp;
  started_at: Timestamp;
  completed_at: Timestamp | null;
  claimed_by: Uuid | null;
  claimed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Consent {
  id: Uuid;
  session_id: Uuid;
  patient_id: Uuid | null;
  consent_version: string;
  status: ConsentStatus;
  language: LanguageCode;
  /** Granular scopes, e.g. { history: true, documents: true, abdm_share: false } */
  scopes: ConsentScopes;
  audio_played: boolean;
  ip_address: string | null;
  created_at: Timestamp;
}

export interface ConsentScopes {
  history?: boolean;
  documents?: boolean;
  abdm_share?: boolean;
  research?: boolean;
}

export interface HistoryResponse {
  id: Uuid;
  session_id: Uuid;
  section: HistorySection;
  question_key: string;
  question_text: string;
  answer: AnswerValue;
  raw_transcript: string | null;
  input_mode: InputMode;
  language: LanguageCode | null;
  confidence: number | null;
  sequence_no: number | null;
  created_at: Timestamp;
}

/** Always an object, so consumers never have to guess between scalar and object. */
export interface AnswerValue {
  value: string | number | boolean | string[] | null;
  label?: string;
  unit?: string;
}

export interface Document {
  id: Uuid;
  session_id: Uuid;
  patient_id: Uuid | null;
  doc_type: DocumentType;
  status: DocumentStatus;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  ocr_text: string | null;
  ocr_confidence: number | null;
  ocr_provider: string | null;
  document_date: DateOnly | null;
  issuing_facility: string | null;
  error_message: string | null;
  uploaded_at: Timestamp;
  processed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ExtractedEntity {
  id: Uuid;
  session_id: Uuid;
  document_id: Uuid | null;
  entity_type: EntityType;
  source: EntitySource;
  raw_text: string;
  normalized_name: string | null;
  attributes: Json;
  confidence: number | null;
  page_number: number | null;
  bounding_box: BoundingBox | null;
  is_verified: boolean;
  verified_by: Uuid | null;
  created_at: Timestamp;
}

/** Normalised 0..1 coordinates so it renders at any zoom level. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Investigation {
  id: Uuid;
  session_id: Uuid;
  document_id: Uuid | null;
  entity_id: Uuid | null;
  test_name: string;
  normalized_test_name: string | null;
  loinc_code: string | null;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  flag: AbnormalFlag;
  test_date: DateOnly | null;
  created_at: Timestamp;
}

export interface TimelineEvent {
  id: Uuid;
  session_id: Uuid;
  document_id: Uuid | null;
  entity_id: Uuid | null;
  event_date: DateOnly | null;
  is_date_approximate: boolean;
  event_type: EntityType;
  title: string;
  description: string | null;
  source: EntitySource;
  created_at: Timestamp;
}

export interface TriageAlert {
  id: Uuid;
  session_id: Uuid;
  risk_level: RiskLevel;
  status: AlertStatus;
  rule_id: string;
  rule_name: string;
  reason: string;
  triggering_findings: TriggeringFinding[];
  detected_by: 'rules' | 'llm';
  acknowledged_by: Uuid | null;
  acknowledged_at: Timestamp | null;
  resolved_by: Uuid | null;
  resolved_at: Timestamp | null;
  resolution_note: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TriggeringFinding {
  question_key: string;
  question_text: string;
  answer: string;
}

export interface Summary {
  id: Uuid;
  session_id: Uuid;
  version: number;
  content: Json;
  rendered_text: string | null;
  review_status: ReviewStatus;
  model_name: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  generation_ms: number | null;
  validation: SummaryValidation;
  created_by: Uuid | null;
  created_at: Timestamp;
}

export interface SummaryValidation {
  schema_valid?: boolean;
  /** Claims in the summary not traceable to any response or document. */
  unsupported_claims?: string[];
  retry_count?: number;
  errors?: string[];
}

export interface SummaryReview {
  id: Uuid;
  summary_id: Uuid;
  session_id: Uuid;
  doctor_id: Uuid;
  action: ReviewStatus;
  /** JSON Pointer, e.g. '/hpi/onset' */
  field_path: string | null;
  ai_value: unknown;
  doctor_value: unknown;
  note: string | null;
  created_at: Timestamp;
}

export interface FhirSubmission {
  id: Uuid;
  session_id: Uuid;
  target: 'abdm-phr' | 'his-emr';
  resource_type: string;
  status: SubmissionStatus;
  payload: Json;
  response_body: Json | null;
  http_status: number | null;
  attempt_count: number;
  last_error: string | null;
  submitted_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AuditLog {
  id: Uuid;
  actor_id: Uuid | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: Uuid | null;
  session_id: Uuid | null;
  metadata: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Timestamp;
}

export interface AyushAssessment {
  session_id: Uuid;
  prakriti: DoshaScores;
  vikriti: DoshaScores;
  sara: string | null;
  samhanana: string | null;
  pramana: Json;
  satmya: string | null;
  sattva: string | null;
  ahara_shakti: string | null;
  vyayama_shakti: string | null;
  vaya: string | null;
  agni: string | null;
  koshtha: string | null;
  ahara_vihara: Json;
  nidana: unknown[];
  samprapti: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Tridosha scores, 0..100 each. Dominant dosha = highest score. */
export interface DoshaScores {
  vata?: number;
  pitta?: number;
  kapha?: number;
  dominant?: 'vata' | 'pitta' | 'kapha' | string;
}

// ─── Insert helpers ────────────────────────────────────────────────────────
// Server-generated columns are omitted so you can't accidentally send them.

type ServerManaged = 'id' | 'created_at' | 'updated_at';

export type Insert<T> = Omit<T, ServerManaged> & Partial<Pick<T, Extract<ServerManaged, keyof T>>>;
export type Update<T> = Partial<Omit<T, ServerManaged>>;
