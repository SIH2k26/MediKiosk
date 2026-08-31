import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth';
import { createSupabaseServiceClient } from '../../utils/supabase';
import { HttpError, createNotFoundError } from '../../middleware/errorHandler';
import { z } from 'zod';

export const doctorRouter = Router();

// Doctor routes require authentication
doctorRouter.use(requireAuth);

const SubmitDoctorReviewSchema = z.object({
  summaryId: z.string().uuid(),
  action: z.enum(['ACCEPT', 'MODIFY', 'REJECT']),
  modifications: z.array(
    z.object({
      field: z.string(),
      originalValue: z.unknown(),
      modifiedValue: z.unknown(),
      reason: z.string().optional(),
    })
  ).optional(),
  finalNotes: z.string().optional(),
  confirmedSummary: z.record(z.unknown()).optional(),
});

/**
 * GET /api/doctor/queue
 * Get today's OPD queue sorted by priority score and wait time.
 */
doctorRouter.get(
  '/queue',
  requireRole(['DOCTOR', 'TRIAGE_STAFF', 'ADMIN']),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const supabase = createSupabaseServiceClient();

      // Fetch active sessions with patient profile & latest summary/alerts
      const { data: sessions, error } = await supabase
        .from('patient_sessions')
        .select(`
          id,
          opd_token,
          status,
          language,
          started_at,
          last_activity_at,
          patients (
            id,
            first_name,
            last_name,
            age,
            gender,
            phone,
            abha_id,
            uhid
          ),
          clinical_summaries (
            id,
            status,
            risk_level,
            chief_complaint_summary,
            red_flags,
            created_at
          ),
          triage_alerts (
            id,
            risk_level,
            priority_score,
            alert_status,
            clinical_category,
            suggested_action,
            is_acknowledged,
            created_at
          )
        `)
        .eq('status', 'ACTIVE')
        .order('started_at', { ascending: true });

      if (error) return next(error);

      // Normalize and sort by highest priority score first
      const queue = (sessions || []).map((s: any) => {
        const alerts = s.triage_alerts || [];
        const highestAlert = alerts.sort((a: any, b: any) => (b.priority_score || 0) - (a.priority_score || 0))[0];
        const latestSummary = (s.clinical_summaries || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          sessionId: s.id,
          opdToken: s.opd_token || `OPD-${s.id.slice(0, 8).toUpperCase()}`,
          status: s.status,
          language: s.language,
          startedAt: s.started_at,
          lastActivityAt: s.last_activity_at,
          patient: s.patients,
          priorityScore: highestAlert?.priority_score || 0,
          riskLevel: highestAlert?.risk_level || latestSummary?.risk_level || 'NORMAL',
          alertStatus: highestAlert?.alert_status || null,
          isAcknowledged: highestAlert?.is_acknowledged ?? true,
          clinicalCategory: highestAlert?.clinical_category || null,
          chiefComplaint: latestSummary?.chief_complaint_summary || 'Intake in progress',
          summaryId: latestSummary?.id || null,
          summaryStatus: latestSummary?.status || null,
        };
      }).sort((a: any, b: any) => (b.priorityScore - a.priorityScore));

      res.json({
        success: true,
        data: queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/doctor/patients/:id
 * Get a specific patient's full clinical record for the doctor portal.
 */
doctorRouter.get(
  '/patients/:id',
  requireRole(['DOCTOR', 'TRIAGE_STAFF', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: patientId } = req.params;
      const supabase = createSupabaseServiceClient();

      // Fetch patient demographics
      const { data: patient, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();

      if (pErr) return next(pErr);
      if (!patient) return next(createNotFoundError('Patient'));

      // Fetch patient's latest clinical summaries
      const { data: summaries } = await supabase
        .from('clinical_summaries')
        .select('*, doctor_reviews(*)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      // Fetch patient's structured clinical histories
      const { data: histories } = await supabase
        .from('clinical_histories')
        .select('*, history_sections(*, history_answers(*))')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      // Fetch medications, allergies, investigations
      const { data: medications } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      const { data: allergies } = await supabase
        .from('allergies')
        .select('*')
        .eq('patient_id', patientId);

      const { data: investigations } = await supabase
        .from('investigations')
        .select('*')
        .eq('patient_id', patientId)
        .order('test_date', { ascending: false });

      // Fetch documents & timeline
      const { data: documents } = await supabase
        .from('documents')
        .select('*, document_pages(*)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      const { data: timeline } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('patient_id', patientId)
        .order('event_date', { ascending: false });

      // Fetch triage alerts
      const { data: triageAlerts } = await supabase
        .from('triage_alerts')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      res.json({
        success: true,
        data: {
          patient,
          latestSummary: summaries?.[0] || null,
          summaries: summaries || [],
          histories: histories || [],
          medications: medications || [],
          allergies: allergies || [],
          investigations: investigations || [],
          documents: documents || [],
          timeline: timeline || [],
          triageAlerts: triageAlerts || [],
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/doctor/reviews
 * Submit a doctor review of an AI-generated clinical summary.
 * Preserves the original AI output, records doctor edits, and sets confirmed status.
 */
doctorRouter.post(
  '/reviews',
  requireRole(['DOCTOR']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const reviewPayload = SubmitDoctorReviewSchema.parse(req.body);
      const supabase = createSupabaseServiceClient();

      // 1. Fetch original summary
      const { data: summary, error: sErr } = await supabase
        .from('clinical_summaries')
        .select('*')
        .eq('id', reviewPayload.summaryId)
        .single();

      if (sErr || !summary) {
        return next(createNotFoundError('Clinical summary'));
      }

      // 2. Fetch doctor profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authReq.userId!)
        .maybeSingle();

      const doctorProfileId = profile?.id;

      // 3. Create doctor review record (preserving original summary)
      const originalSummarySnapshot = JSON.stringify({
        chiefComplaintSummary: summary.chief_complaint_summary,
        hpiNarrative: summary.hpi_narrative,
        pastHistorySummary: summary.past_history_summary,
        medicationSummary: summary.medication_summary,
        allergySummary: summary.allergy_summary,
        investigationSummary: summary.investigation_summary,
        timelineSummary: summary.timeline_summary,
        riskLevel: summary.risk_level,
        redFlags: summary.red_flags,
      });

      const { data: review, error: rErr } = await supabase
        .from('doctor_reviews')
        .insert({
          summary_id: reviewPayload.summaryId,
          doctor_id: doctorProfileId,
          action: reviewPayload.action,
          original_summary: originalSummarySnapshot,
          modifications: reviewPayload.modifications || [],
          final_notes: reviewPayload.finalNotes,
          confirmed_at: reviewPayload.action === 'ACCEPT' || reviewPayload.action === 'MODIFY' ? new Date().toISOString() : null,
        })
        .select('*')
        .single();

      if (rErr) return next(rErr);

      // 4. Update clinical summary status & modified fields if any
      const newStatus = reviewPayload.action === 'REJECT' ? 'REJECTED' : 'CONFIRMED';
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (reviewPayload.confirmedSummary) {
        if (reviewPayload.confirmedSummary.chiefComplaintSummary) {
          updateData.chief_complaint_summary = reviewPayload.confirmedSummary.chiefComplaintSummary;
        }
        if (reviewPayload.confirmedSummary.hpiNarrative) {
          updateData.hpi_narrative = reviewPayload.confirmedSummary.hpiNarrative;
        }
        if (reviewPayload.confirmedSummary.pastHistorySummary) {
          updateData.past_history_summary = reviewPayload.confirmedSummary.pastHistorySummary;
        }
        if (reviewPayload.confirmedSummary.medicationSummary) {
          updateData.medication_summary = reviewPayload.confirmedSummary.medicationSummary;
        }
        if (reviewPayload.confirmedSummary.investigationSummary) {
          updateData.investigation_summary = reviewPayload.confirmedSummary.investigationSummary;
        }
      }

      await supabase
        .from('clinical_summaries')
        .update(updateData)
        .eq('id', reviewPayload.summaryId);

      // 5. Audit log
      await supabase.from('audit_logs').insert({
        actor_id: doctorProfileId,
        actor_role: 'DOCTOR',
        patient_id: summary.patient_id,
        action: 'DOCTOR_REVIEW_SUBMITTED',
        resource_type: 'clinical_summary',
        resource_id: summary.id,
        details: {
          action: reviewPayload.action,
          review_id: review.id,
          modificationsCount: reviewPayload.modifications?.length || 0,
        },
      });

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/doctor/patients/:id/timeline
 * Get the patient's medical timeline.
 */
doctorRouter.get(
  '/patients/:id/timeline',
  requireRole(['DOCTOR', 'TRIAGE_STAFF', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: patientId } = req.params;
      const supabase = createSupabaseServiceClient();

      const { data: timeline, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('patient_id', patientId)
        .order('event_date', { ascending: false });

      if (error) return next(error);

      res.json({
        success: true,
        data: timeline || [],
      });
    } catch (err) {
      next(err);
    }
  }
);
