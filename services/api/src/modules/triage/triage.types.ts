/**
 * Local TypeScript types for the triage module.
 * Mirrors the triage_alerts table shape (migration 002) and the DTOs
 * used by the triage router.
 */

import { RiskLevel, AlertStatus } from '@medikiosk/shared-types';

// ---------------------------------------------------------------------------
// DB row shape (snake_case from Supabase)
// ---------------------------------------------------------------------------

export interface TriageAlertRow {
  id: string;
  patient_id: string;
  session_id: string;
  section_type: string | null;
  risk_level: RiskLevel;
  red_flags: unknown[];        // JSONB — RedFlag[]
  alert_status: AlertStatus;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  escalated_at: string | null;
  escalation_notes: string | null;
  priority_score: number;
  clinical_category: string | null;
  suggested_action: string | null;
  time_to_intervention_minutes: number | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// DTOs — inbound from the history router after AI processing
// ---------------------------------------------------------------------------

export interface CreateTriageAlertDto {
  patient_id: string;
  session_id: string;
  section_type: string;
  risk_level: RiskLevel;
  red_flags: unknown[];
  priority_score: number;
  clinical_category?: string;
  suggested_action?: string;
  time_to_intervention_minutes?: number;
}

export interface AlertFilters {
  alert_status?: AlertStatus;
  risk_level?: RiskLevel;
  is_acknowledged?: boolean;
  session_id?: string;
  patient_id?: string;
  limit?: number;
  offset?: number;
}

export interface AcknowledgeAlertDto {
  acknowledged_by: string;    // profile ID of the staff member
}

export interface ResolveAlertDto {
  resolved_by: string;        // profile ID
  resolution_notes: string;
}

export interface EscalateAlertDto {
  escalated_by: string;       // profile ID
  escalation_notes: string;
}
