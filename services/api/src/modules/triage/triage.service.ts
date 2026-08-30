/**
 * TriageService — server-side triage alert CRUD.
 *
 * All mutations use the Supabase SERVICE-ROLE client (bypasses RLS).
 * This is intentional: only the Express API backend may write triage alerts.
 * Frontend clients (anon key, RLS-enforced) can only READ via SELECT policies
 * and subscribe via Supabase Realtime.
 *
 * POST /api/triage/alerts is protected at the router level so that no
 * authenticated user (even ADMIN) can craft arbitrary alerts via the public API.
 */

import { createSupabaseServiceClient } from '../../utils/supabase';
import {
  AlertFilters,
  AcknowledgeAlertDto,
  CreateTriageAlertDto,
  EscalateAlertDto,
  ResolveAlertDto,
  TriageAlertRow,
} from './triage.types';
import { HttpError } from '../../middleware/errorHandler';

function formatAlertRow(row: any): any {
  if (!row) return row;
  const patient = row.patient
    ? {
        ...row.patient,
        firstName: row.patient.first_name ?? row.patient.firstName ?? 'Walk-in',
        lastName: row.patient.last_name ?? row.patient.lastName ?? 'Patient',
      }
    : null;

  return {
    ...row,
    patientId: row.patient_id ?? row.patientId,
    sessionId: row.session_id ?? row.sessionId,
    riskLevel: row.risk_level ?? row.riskLevel,
    redFlags: row.red_flags ?? row.redFlags ?? [],
    isAcknowledged: row.is_acknowledged ?? row.isAcknowledged ?? false,
    acknowledgedBy: row.acknowledged_by ?? row.acknowledgedBy,
    acknowledgedAt: row.acknowledged_at ?? row.acknowledgedAt,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    alertStatus: row.alert_status ?? row.alertStatus ?? 'ACTIVE',
    resolvedBy: row.resolved_by ?? row.resolvedBy,
    resolvedAt: row.resolved_at ?? row.resolvedAt,
    resolutionNotes: row.resolution_notes ?? row.resolutionNotes,
    escalatedAt: row.escalated_at ?? row.escalatedAt,
    escalationNotes: row.escalation_notes ?? row.escalationNotes,
    priorityScore: row.priority_score ?? row.priorityScore ?? 0,
    clinicalCategory: row.clinical_category ?? row.clinicalCategory,
    suggestedAction: row.suggested_action ?? row.suggestedAction,
    timeToInterventionMinutes: row.time_to_intervention_minutes ?? row.timeToInterventionMinutes,
    sectionType: row.section_type ?? row.sectionType,
    patient,
  };
}

export class TriageService {
  private get db() {
    return createSupabaseServiceClient();
  }

  // -------------------------------------------------------------------------
  // CREATE — called internally by the history router after AI processing.
  // Idempotent: if an ACTIVE/ACKNOWLEDGED alert already exists for the same
  // (session_id, section_type) pair, returns the existing alert rather than
  // throwing. The unique index in migration 002 enforces this at the DB level.
  // -------------------------------------------------------------------------
  async createAlert(dto: CreateTriageAlertDto): Promise<TriageAlertRow> {
    // 1. Ensure parent patient record exists to satisfy FK constraint
    await this.db.from('patients').upsert(
      {
        id: dto.patient_id,
        first_name: 'Walk-in',
        last_name: 'Patient',
        is_anonymous: true,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    // 2. Ensure parent patient_session record exists to satisfy FK constraint
    await this.db.from('patient_sessions').upsert(
      {
        id: dto.session_id,
        patient_id: dto.patient_id,
        status: 'ACTIVE',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    // 3. Insert the alert row into triage_alerts
    const alertData = {
      patient_id: dto.patient_id,
      session_id: dto.session_id,
      section_type: dto.section_type,
      risk_level: dto.risk_level,
      red_flags: dto.red_flags,
      alert_status: 'ACTIVE',
      is_acknowledged: false,
      priority_score: dto.priority_score,
      clinical_category: dto.clinical_category ?? null,
      suggested_action: dto.suggested_action ?? null,
      time_to_intervention_minutes: dto.time_to_intervention_minutes ?? null,
    };

    const { data, error } = await this.db
      .from('triage_alerts')
      .insert(alertData)
      .select(`*, patient:patients(first_name, last_name, age, gender)`)
      .single();

    if (error) {
      // 4. Gracefully handle unique constraint duplicate (error 23505): update existing active alert
      if (error.code === '23505') {
        const { data: updated } = await this.db
          .from('triage_alerts')
          .update({
            risk_level: dto.risk_level,
            red_flags: dto.red_flags,
            priority_score: dto.priority_score,
            clinical_category: dto.clinical_category ?? null,
            suggested_action: dto.suggested_action ?? null,
            time_to_intervention_minutes: dto.time_to_intervention_minutes ?? null,
          })
          .eq('session_id', dto.session_id)
          .eq('section_type', dto.section_type)
          .in('alert_status', ['ACTIVE', 'ACKNOWLEDGED'])
          .select(`*, patient:patients(first_name, last_name, age, gender)`)
          .single();

        if (updated) {
          return formatAlertRow(updated) as TriageAlertRow;
        }
      }
      console.error('[TriageService] Error inserting triage alert into database:', error);
      throw new HttpError(500, 'TRIAGE_CREATE_FAILED', error.message);
    }

    return formatAlertRow(data) as TriageAlertRow;
  }

  // -------------------------------------------------------------------------
  // LIST — filtered, ordered by priority_score DESC then created_at DESC.
  // Joins patient first/last name for display.
  // -------------------------------------------------------------------------
  async getAlerts(filters: AlertFilters): Promise<{ items: TriageAlertRow[]; total: number }> {
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = filters.offset ?? 0;

    let query = this.db
      .from('triage_alerts')
      .select(
        `
        *,
        patient:patients(first_name, last_name, age, gender)
        `,
        { count: 'exact' }
      )
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.alert_status) query = query.eq('alert_status', filters.alert_status);
    if (filters.risk_level) query = query.eq('risk_level', filters.risk_level);
    if (filters.is_acknowledged !== undefined)
      query = query.eq('is_acknowledged', filters.is_acknowledged);
    if (filters.session_id) query = query.eq('session_id', filters.session_id);
    if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);

    const { data, error, count } = await query;
    if (error) throw new HttpError(500, 'TRIAGE_FETCH_FAILED', error.message);

    const items = (data ?? []).map(formatAlertRow) as TriageAlertRow[];
    return { items, total: count ?? 0 };
  }

  // -------------------------------------------------------------------------
  // GET BY ID
  // -------------------------------------------------------------------------
  async getAlertById(id: string): Promise<TriageAlertRow> {
    const { data, error } = await this.db
      .from('triage_alerts')
      .select(
        `
        *,
        patient:patients(first_name, last_name, age, gender)
        `
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new HttpError(404, 'TRIAGE_NOT_FOUND', 'Triage alert not found');
    return formatAlertRow(data) as TriageAlertRow;
  }

  // -------------------------------------------------------------------------
  // ACKNOWLEDGE
  // -------------------------------------------------------------------------
  async acknowledgeAlert(id: string, dto: AcknowledgeAlertDto): Promise<TriageAlertRow> {
    // Only allow acknowledging ACTIVE alerts
    const existing = await this.getAlertById(id);
    if (existing.alert_status === 'RESOLVED') {
      throw new HttpError(409, 'ALREADY_RESOLVED', 'Alert is already resolved');
    }

    const { data, error } = await this.db
      .from('triage_alerts')
      .update({
        alert_status: 'ACKNOWLEDGED',
        is_acknowledged: true,
        acknowledged_by: dto.acknowledged_by,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new HttpError(500, 'TRIAGE_UPDATE_FAILED', error.message);
    return data as TriageAlertRow;
  }

  // -------------------------------------------------------------------------
  // RESOLVE
  // -------------------------------------------------------------------------
  async resolveAlert(id: string, dto: ResolveAlertDto): Promise<TriageAlertRow> {
    const existing = await this.getAlertById(id);
    if (existing.alert_status === 'RESOLVED') {
      throw new HttpError(409, 'ALREADY_RESOLVED', 'Alert is already resolved');
    }

    const { data, error } = await this.db
      .from('triage_alerts')
      .update({
        alert_status: 'RESOLVED',
        resolved_by: dto.resolved_by,
        resolved_at: new Date().toISOString(),
        resolution_notes: dto.resolution_notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new HttpError(500, 'TRIAGE_UPDATE_FAILED', error.message);
    return data as TriageAlertRow;
  }

  // -------------------------------------------------------------------------
  // ESCALATE
  // -------------------------------------------------------------------------
  async escalateAlert(id: string, dto: EscalateAlertDto): Promise<TriageAlertRow> {
    const existing = await this.getAlertById(id);
    if (existing.alert_status === 'RESOLVED') {
      throw new HttpError(409, 'ALREADY_RESOLVED', 'Cannot escalate a resolved alert');
    }

    const { data, error } = await this.db
      .from('triage_alerts')
      .update({
        alert_status: 'ESCALATED',
        escalated_at: new Date().toISOString(),
        escalation_notes: dto.escalation_notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new HttpError(500, 'TRIAGE_UPDATE_FAILED', error.message);
    return data as TriageAlertRow;
  }

  // -------------------------------------------------------------------------
  // AUDIT LOG helper
  // -------------------------------------------------------------------------
  async insertAuditLog(entry: {
    actor_id: string;
    actor_role: string;
    patient_id?: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.from('audit_logs').insert(entry);
    // Fire-and-forget — audit log failure should not fail the main request
  }
}

export const triageService = new TriageService();
