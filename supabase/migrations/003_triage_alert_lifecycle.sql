-- =============================================================================
-- MediKiosk — Triage Alert Lifecycle
-- Migration: 002_triage_alert_lifecycle.sql
-- =============================================================================
-- Extends the triage_alerts table with full alert lifecycle tracking:
--   ACTIVE → ACKNOWLEDGED → (ESCALATED | RESOLVED)
-- Adds idempotency constraint to prevent duplicate alerts per session.
-- Enables Supabase Realtime on triage_alerts for real-time delivery.
-- =============================================================================

-- ── New enum ─────────────────────────────────────────────────────────────────
CREATE TYPE alert_status AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED');

-- ── Lifecycle columns on triage_alerts ───────────────────────────────────────
ALTER TABLE triage_alerts
  ADD COLUMN alert_status         alert_status NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN resolved_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN resolved_at          TIMESTAMPTZ,
  ADD COLUMN resolution_notes     TEXT,
  ADD COLUMN escalated_at         TIMESTAMPTZ,
  ADD COLUMN escalation_notes     TEXT,
  -- Computed from risk_level at insert time; stored for fast ORDER BY without a CASE expression.
  -- EMERGENCY=100, HIGH_PRIORITY=75, WARNING=50, NORMAL=0
  ADD COLUMN priority_score       INTEGER NOT NULL DEFAULT 0
                                  CHECK (priority_score IN (0, 50, 75, 100)),
  ADD COLUMN clinical_category    TEXT,   -- CARDIAC | NEUROLOGICAL | ABDOMINAL | …
  ADD COLUMN suggested_action     TEXT,   -- protocol-neutral guidance, never diagnostic
  ADD COLUMN time_to_intervention_minutes INTEGER,
  -- Idempotency: one alert per (session, section, risk_level) tuple.
  -- If the pipeline is retried for the same section at the same risk level,
  -- the INSERT will fail this constraint and the Express API catches it
  -- instead of creating duplicate alerts.
  ADD COLUMN section_type         TEXT;

-- Idempotency unique constraint: one ACTIVE/ACKNOWLEDGED alert per session + section.
-- Resolved/escalated alerts are exempt so historical records are preserved.
CREATE UNIQUE INDEX uq_triage_alert_active_per_session_section
  ON triage_alerts (session_id, section_type)
  WHERE alert_status IN ('ACTIVE', 'ACKNOWLEDGED');

-- Performance indexes
CREATE INDEX idx_triage_alerts_alert_status  ON triage_alerts(alert_status);
CREATE INDEX idx_triage_alerts_priority_score ON triage_alerts(priority_score DESC);
CREATE INDEX idx_triage_alerts_resolved_by   ON triage_alerts(resolved_by) WHERE resolved_by IS NOT NULL;

-- ── Updated-at trigger ────────────────────────────────────────────────────────
-- triage_alerts has no updated_at in the base schema; add it now.
ALTER TABLE triage_alerts
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER trigger_triage_alerts_updated_at
  BEFORE UPDATE ON triage_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Additional RLS policies ───────────────────────────────────────────────────
-- Insert is server-side only (Express uses service-role key which bypasses RLS).
-- Patients never see triage_alerts rows.

-- Triage staff and doctors can resolve alerts
CREATE POLICY "Medical staff can resolve triage alerts"
  ON triage_alerts FOR UPDATE
  USING (get_user_role() IN ('DOCTOR', 'TRIAGE_STAFF', 'ADMIN'))
  WITH CHECK (get_user_role() IN ('DOCTOR', 'TRIAGE_STAFF', 'ADMIN'));

-- ── Enable Supabase Realtime ──────────────────────────────────────────────────
-- This allows frontend clients (anon key, RLS enforced) to subscribe to
-- INSERT/UPDATE events on triage_alerts via the Supabase Realtime channel.
-- Clients receive only rows they are RLS-permitted to SELECT.
ALTER PUBLICATION supabase_realtime ADD TABLE triage_alerts;

-- ── Comments ─────────────────────────────────────────────────────────────────
COMMENT ON COLUMN triage_alerts.alert_status IS
  'Lifecycle state: ACTIVE→ACKNOWLEDGED→ESCALATED|RESOLVED.';
COMMENT ON COLUMN triage_alerts.priority_score IS
  'Numeric sort key: EMERGENCY=100, HIGH_PRIORITY=75, WARNING=50, NORMAL=0.';
COMMENT ON COLUMN triage_alerts.suggested_action IS
  'Protocol-neutral guidance for triage staff. Never diagnostic language.';
COMMENT ON COLUMN triage_alerts.section_type IS
  'History section that triggered the alert. Used for idempotency constraint.';
COMMENT ON INDEX uq_triage_alert_active_per_session_section IS
  'Prevents duplicate ACTIVE/ACKNOWLEDGED alerts for the same session+section. '
  'Retried processing requests are safe — the second INSERT is rejected.';
