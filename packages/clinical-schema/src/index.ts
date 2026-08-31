import { z } from 'zod';

// =============================================================================
// MediKiosk Clinical Zod Schemas
// =============================================================================
// Validation schemas that mirror the shared TypeScript interfaces.
// Use these to validate all external inputs (API requests, AI outputs).
// =============================================================================

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(['PATIENT', 'DOCTOR', 'TRIAGE_STAFF', 'ADMIN']);

export const RiskLevelSchema = z.enum(['NORMAL', 'WARNING', 'HIGH_PRIORITY', 'EMERGENCY']);

export const LanguageSchema = z.enum(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa']);

export const DocumentTypeSchema = z.enum([
  'PRESCRIPTION',
  'LAB_REPORT',
  'DISCHARGE_SUMMARY',
  'IMAGING_REPORT',
  'PROCEDURE_RECORD',
  'OTHER',
]);

export const DocumentStatusSchema = z.enum([
  'UPLOADED',
  'PROCESSING',
  'PROCESSED',
  'FAILED',
  'REQUIRES_REVIEW',
]);

export const GenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

export const ConsentStatusSchema = z.enum(['PENDING', 'GRANTED', 'REVOKED', 'DECLINED']);

export const SessionStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED', 'EXPIRED']);

export const SummaryStatusSchema = z.enum([
  'GENERATING',
  'READY',
  'DOCTOR_REVIEWING',
  'CONFIRMED',
  'REJECTED',
  'draft_ai',
  'validation_failed',
]);

export const ReviewActionSchema = z.enum(['ACCEPT', 'MODIFY', 'REJECT']);

export const HistorySectionTypeSchema = z.enum([
  'CHIEF_COMPLAINT',
  'HPI',
  'PAST_MEDICAL_HISTORY',
  'PAST_SURGICAL_HISTORY',
  'MEDICATIONS',
  'ALLERGIES',
  'FAMILY_HISTORY',
  'PERSONAL_HISTORY',
  'REVIEW_OF_SYSTEMS',
  'AYUSH',
]);

// ---------------------------------------------------------------------------
// Patient
// ---------------------------------------------------------------------------

export const PatientAddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().optional(),
});

export const CreatePatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: GenderSchema.optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
    .optional(),
  email: z.string().email().optional(),
  address: PatientAddressSchema.optional(),
  preferredLanguage: LanguageSchema.default('hi'),
  abhaId: z.string().optional(),
  uhid: z.string().optional(),
  isAnonymous: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

export const CreateConsentSchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid(),
  consentVersion: z.string().min(1),
  audioConfirmationUrl: z.string().url().optional(),
});

// ---------------------------------------------------------------------------
// Chief Complaint
// ---------------------------------------------------------------------------

export const ChiefComplaintSchema = z.object({
  complaint: z.string().min(1, 'Complaint text is required'),
  duration: z.string().optional(),
  severity: z.number().int().min(1).max(10).optional(),
  onset: z.string().optional(),
});

// ---------------------------------------------------------------------------
// HPI
// ---------------------------------------------------------------------------

export const HPISchema = z.object({
  onset: z.string().optional(),
  duration: z.string().optional(),
  character: z.string().optional(),
  location: z.string().optional(),
  radiation: z.string().optional(),
  severity: z.number().int().min(1).max(10).optional(),
  aggravatingFactors: z.array(z.string()).optional(),
  relievingFactors: z.array(z.string()).optional(),
  associatedSymptoms: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  context: z.string().optional(),
  narrative: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Medications & Allergies
// ---------------------------------------------------------------------------

export const MedicationSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  prescribedBy: z.string().optional(),
  isCurrentlyTaking: z.boolean(),
  sourceDocumentId: z.string().uuid().optional(),
  pageNumber: z.number().int().optional(),
});

export const AllergySchema = z.object({
  substance: z.string().min(1),
  type: z.enum(['DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER']).optional(),
  reaction: z.string().optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'ANAPHYLAXIS']).optional(),
  sourceDocumentId: z.string().uuid().optional(),
  pageNumber: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Investigation
// ---------------------------------------------------------------------------

export const ReferenceRangeSchema = z.object({
  low: z.number().optional(),
  high: z.number().optional(),
  unit: z.string().optional(),
  ageRange: z.string().optional(),
});

export const InvestigationSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
  unit: z.string().optional(),
  referenceRange: ReferenceRangeSchema.optional(),
  status: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'UNKNOWN']).optional(),
  testDate: z.string().optional(),
  laboratory: z.string().optional(),
  isAbnormal: z.boolean().optional(),
  notes: z.string().optional(),
  sourceDocumentId: z.string().uuid().optional(),
  pageNumber: z.number().int().optional(),
  extractedByAI: z.boolean().default(false),
  confidence: z.number().min(0).max(1).optional(),
});

// ---------------------------------------------------------------------------
// History Answer
// ---------------------------------------------------------------------------

export const CreateHistoryAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  sectionId: z.string().uuid(),
  questionId: z.string(),
  questionText: z.string(),
  answerType: z.enum(['VOICE', 'TOUCH', 'TEXT']),
  rawAnswer: z.string().min(1),
  audioUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// ---------------------------------------------------------------------------
// Document Upload
// ---------------------------------------------------------------------------

export const CreateDocumentSchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid(),
  type: DocumentTypeSchema,
  originalFileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Clinical Summary
// ---------------------------------------------------------------------------

export const GenerateSummarySchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Doctor Review
// ---------------------------------------------------------------------------

export const SummaryModificationSchema = z.object({
  field: z.string(),
  originalValue: z.unknown(),
  modifiedValue: z.unknown(),
  reason: z.string().optional(),
});

export const CreateDoctorReviewSchema = z.object({
  summaryId: z.string().uuid(),
  action: ReviewActionSchema,
  modifications: z.array(SummaryModificationSchema).optional(),
  finalNotes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Red Flag
// ---------------------------------------------------------------------------

export const RedFlagSchema = z.object({
  type: z.string(),
  description: z.string(),
  severity: RiskLevelSchema,
  triggeredBy: z.array(z.string()),
  requiresImmediateAttention: z.boolean(),
});

// ---------------------------------------------------------------------------
// AI Service Payloads
// ---------------------------------------------------------------------------

/**
 * Payload sent from Express API to ai-history FastAPI service
 */
export const ProcessHistoryPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  patientId: z.string().uuid(),
  language: LanguageSchema,
  answers: z.array(CreateHistoryAnswerSchema),
  sectionType: HistorySectionTypeSchema,
});

/**
 * Payload sent from Express API to ai-documents FastAPI service
 */
export const ProcessDocumentPayloadSchema = z.object({
  documentId: z.string().uuid(),
  storageUrl: z.string().url(),
  mimeType: z.string(),
  language: LanguageSchema,
});

/**
 * Response from ai-documents service after OCR + extraction
 */
export const DocumentProcessingResultSchema = z.object({
  documentId: z.string().uuid(),
  ocrText: z.string(),
  confidence: z.number().min(0).max(1),
  extractedEntities: z.array(
    z.object({
      entityType: z.string(),
      value: z.string(),
      normalizedValue: z.string().optional(),
      confidence: z.number().min(0).max(1),
      pageNumber: z.number().int().optional(),
    })
  ),
  medications: z.array(MedicationSchema),
  investigations: z.array(InvestigationSchema),
  allergies: z.array(AllergySchema),
  processingDurationMs: z.number(),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript Types from Zod (use where convenient)
// ---------------------------------------------------------------------------

export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type CreateConsent = z.infer<typeof CreateConsentSchema>;
export type CreateHistoryAnswer = z.infer<typeof CreateHistoryAnswerSchema>;
export type CreateDocument = z.infer<typeof CreateDocumentSchema>;
export type GenerateSummary = z.infer<typeof GenerateSummarySchema>;
export type CreateDoctorReview = z.infer<typeof CreateDoctorReviewSchema>;
export type ProcessHistoryPayload = z.infer<typeof ProcessHistoryPayloadSchema>;
export type ProcessDocumentPayload = z.infer<typeof ProcessDocumentPayloadSchema>;
export type DocumentProcessingResult = z.infer<typeof DocumentProcessingResultSchema>;
