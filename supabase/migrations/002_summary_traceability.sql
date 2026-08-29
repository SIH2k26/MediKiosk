-- Migration: 002_summary_traceability.sql
-- Additive changes for summary traceability and conversational linking

-- 1. Add fields to medications
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS page_number INTEGER,
  ADD COLUMN IF NOT EXISTS answer_id UUID REFERENCES history_answers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('document', 'conversation'));

-- 2. Add fields to investigations
ALTER TABLE investigations
  ADD COLUMN IF NOT EXISTS page_number INTEGER,
  ADD COLUMN IF NOT EXISTS answer_id UUID REFERENCES history_answers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('document', 'conversation'));

-- 3. Add fields to allergies
ALTER TABLE allergies
  ADD COLUMN IF NOT EXISTS page_number INTEGER,
  ADD COLUMN IF NOT EXISTS answer_id UUID REFERENCES history_answers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('document', 'conversation'));

-- 4. Add summary_sources to clinical_summaries
ALTER TABLE clinical_summaries
  ADD COLUMN IF NOT EXISTS summary_sources JSONB;

-- 5. Add new status values to summary_status enum
COMMIT;
ALTER TYPE summary_status ADD VALUE IF NOT EXISTS 'draft_ai';
ALTER TYPE summary_status ADD VALUE IF NOT EXISTS 'validation_failed';
BEGIN;

-- Update the default of clinical_summaries status to 'draft_ai'
ALTER TABLE clinical_summaries
  ALTER COLUMN status SET DEFAULT 'draft_ai'::summary_status;
