/**
 * History Router — /api/history
 *
 * Provides endpoints for clinical history session lifecycle:
 *   - POST /sessions: Initialize clinical history and sections (idempotent, supports AYUSH)
 *   - POST /sessions/:id/answers: Record individual question answers (touch/voice/text)
 *   - POST /sessions/:id/sections/:sectionType/complete: Mark a section complete
 *   - GET  /sessions/:id: Retrieve history session with all sections & answers
 *   - GET  /:patientId: Retrieve clinical history records for a patient
 *   - POST /sessions/:id/process: Trigger AI processing via ai-history service,
 *          evaluate AST red flags / protocol triage, and create triage alerts.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../../middleware/auth';
import { createSupabaseServiceClient } from '../../utils/supabase';
import { HttpError, createNotFoundError } from '../../middleware/errorHandler';
import { triageService } from '../triage/triage.service';
import { RiskLevel } from '@medikiosk/shared-types';
import { z } from 'zod';

export const historyRouter = Router();

const AI_HISTORY_URL = process.env.AI_HISTORY_URL ?? 'http://localhost:8000';

// Risk levels that trigger a triage alert
const ALERT_RISK_LEVELS: RiskLevel[] = ['WARNING', 'HIGH_PRIORITY', 'EMERGENCY'];

// Map RiskLevel → priority_score
const PRIORITY_SCORE: Record<RiskLevel, number> = {
  NORMAL:        0,
  WARNING:       50,
  HIGH_PRIORITY: 75,
  EMERGENCY:     100,
};

const SECTION_TYPES = [
  'CHIEF_COMPLAINT',
  'HPI',
  'PAST_MEDICAL_HISTORY',
  'PAST_SURGICAL_HISTORY',
  'MEDICATIONS',
  'ALLERGIES',
  'FAMILY_HISTORY',
  'PERSONAL_HISTORY',
  'REVIEW_OF_SYSTEMS',
] as const;

const StartHistorySchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid(),
  ayushMode: z.boolean().default(false),
});

const SubmitAnswerSchema = z.object({
  sectionType: z.enum([...SECTION_TYPES, 'AYUSH']),
  questionId: z.string().min(1),
  questionText: z.string().min(1),
  answerType: z.enum(['VOICE', 'TOUCH', 'TEXT']),
  rawAnswer: z.string().min(1),
  audioUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

function mapSection(row: any) {
  return {
    id: row.id,
    historyId: row.history_id,
    sectionType: row.section_type,
    isComplete: row.is_complete,
    completedAt: row.completed_at,
  };
}

/**
 * POST /api/history/sessions
 * Start a clinical history for an intake session (idempotent per session).
 * Creates the root record plus all standard section rows.
 * Kiosk-accessible without auth.
 */
historyRouter.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, sessionId, ayushMode } = StartHistorySchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    // Idempotency: reuse the existing history for this session
    let { data: history } = await supabase
      .from('clinical_histories')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (!history) {
      const { data: created, error: createError } = await supabase
        .from('clinical_histories')
        .insert({ patient_id: patientId, session_id: sessionId, ayush_mode: ayushMode })
        .select('*')
        .single();
      if (createError) return next(createError);
      history = created;

      const sectionTypes = ayushMode ? [...SECTION_TYPES, 'AYUSH'] : [...SECTION_TYPES];
      const { error: sectionsError } = await supabase
        .from('history_sections')
        .insert(sectionTypes.map((sectionType) => ({ history_id: history!.id, section_type: sectionType })));
      if (sectionsError) return next(sectionsError);
    }

    const { data: sections, error: fetchError } = await supabase
      .from('history_sections')
      .select('*')
      .eq('history_id', history.id);
    if (fetchError) return next(fetchError);

    res.status(201).json({
      success: true,
      data: {
        id: history.id,
        patientId: history.patient_id,
        sessionId: history.session_id,
        ayushMode: history.ayush_mode,
        completedAt: history.completed_at,
        sections: (sections || []).map(mapSection),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/history/sessions/:id/answers
 * Record a question answer within a history section.
 * Kiosk-accessible without auth.
 */
historyRouter.post('/sessions/:id/answers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: historyId } = req.params;
    const answer = SubmitAnswerSchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    const { data: section, error: sectionError } = await supabase
      .from('history_sections')
      .select('id')
      .eq('history_id', historyId)
      .eq('section_type', answer.sectionType)
      .maybeSingle();
    if (sectionError) return next(sectionError);
    if (!section) return next(createNotFoundError('History section'));

    const { data, error } = await supabase
      .from('history_answers')
      .insert({
        section_id: section.id,
        question_id: answer.questionId,
        question_text: answer.questionText,
        answer_type: answer.answerType,
        raw_answer: answer.rawAnswer,
        audio_url: answer.audioUrl,
        confidence: answer.confidence,
      })
      .select('*')
      .single();
    if (error) return next(error);

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        sectionId: data.section_id,
        questionId: data.question_id,
        answerType: data.answer_type,
        rawAnswer: data.raw_answer,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/history/sessions/:id/sections/:sectionType/complete
 * Mark a section complete. Marks the whole history complete when all sections are done.
 */
historyRouter.post('/sessions/:id/sections/:sectionType/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: historyId, sectionType } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data: section, error } = await supabase
      .from('history_sections')
      .update({ is_complete: true, completed_at: new Date().toISOString() })
      .eq('history_id', historyId)
      .eq('section_type', sectionType)
      .select('*')
      .maybeSingle();
    if (error) return next(error);
    if (!section) return next(createNotFoundError('History section'));

    // If every section is complete, close the history
    const { data: remaining } = await supabase
      .from('history_sections')
      .select('id')
      .eq('history_id', historyId)
      .eq('is_complete', false);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from('clinical_histories')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', historyId);
    }

    res.json({ success: true, data: mapSection(section) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/history/sessions/:id
 * Get a history session with all sections and answers.
 */
historyRouter.get('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data: history, error } = await supabase
      .from('clinical_histories')
      .select('*, history_sections(*, history_answers(*))')
      .eq('id', id)
      .maybeSingle();
    if (error) return next(error);
    if (!history) return next(createNotFoundError('Clinical history'));

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/history/:patientId
 * Get complete clinical history records for a patient (staff only).
 */
historyRouter.get('/:patientId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('clinical_histories')
      .select('*, history_sections(*, history_answers(*))')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) return next(error);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/history/sessions/:id/process
 *
 * Trigger AI processing of history answers via the ai-history Python service.
 * Orchestrates:
 *   1. Forward payload to POST /history/process on the ai-history service
 *   2. If red flags detected (risk_level >= WARNING):
 *        → create a triage alert in Supabase (idempotent via upsert)
 *        → Supabase Realtime broadcasts INSERT/UPDATE to subscribed frontends
 *   3. Return the full processing result enriched with triage_alert_id
 */
historyRouter.post(
  '/sessions/:id/process',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const sessionId = req.params.id;
      const body = req.body;

      if (!body.patient_id || !body.section_type || !Array.isArray(body.answers)) {
        return next(
          new HttpError(400, 'VALIDATION_ERROR', 'patient_id, section_type and answers are required')
        );
      }

      // ── 1. Forward to ai-history service ──────────────────────────────────
      const aiResponse = await fetch(`${AI_HISTORY_URL}/history/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          patient_id: body.patient_id,
          language: body.language ?? 'en',
          section_type: body.section_type,
          answers: body.answers,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text().catch(() => 'Unknown error');
        throw new HttpError(502, 'AI_SERVICE_ERROR', `AI history service error: ${errorText}`);
      }

      const aiResult = await aiResponse.json();
      const riskLevel = (aiResult.risk_level as RiskLevel) ?? 'NORMAL';

      // ── 2. Create triage alert if risk >= WARNING ──────────────────────────
      let triageAlertId: string | null = null;

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validPatientId = UUID_REGEX.test(body.patient_id) ? body.patient_id : '00000000-0000-0000-0000-000000000001';
      const validSessionId = UUID_REGEX.test(sessionId) ? sessionId : '00000000-0000-0000-0000-000000000002';

      if (ALERT_RISK_LEVELS.includes(riskLevel)) {
        try {
          const triage = aiResult.triage_classification;
          const alert = await triageService.createAlert({
            patient_id: validPatientId,
            session_id: validSessionId,
            section_type: body.section_type,
            risk_level: riskLevel,
            red_flags: aiResult.red_flags ?? [],
            priority_score: PRIORITY_SCORE[riskLevel],
            clinical_category: triage?.clinical_categories?.[0] ?? undefined,
            suggested_action: triage?.protocol_action ?? undefined,
            time_to_intervention_minutes: triage?.time_to_intervention_minutes ?? undefined,
          });

          triageAlertId = alert.id;
          console.log('[HistoryRouter] Triage alert created successfully in DB:', alert.id, 'for patient:', validPatientId);

          // Fire-and-forget audit log
          if (authReq.userId) {
            triageService.insertAuditLog({
              actor_id: authReq.userId,
              actor_role: authReq.userRole ?? 'PATIENT',
              patient_id: body.patient_id,
              action: 'TRIAGE_ALERT_CREATED',
              resource_type: 'triage_alert',
              resource_id: alert.id,
              details: {
                risk_level: riskLevel,
                section_type: body.section_type,
                flag_count: aiResult.red_flags?.length ?? 0,
              },
            });
          }
        } catch (triageErr: unknown) {
          // Don't fail the patient-facing request if alert creation fails.
          console.error('[TriageAlert] Failed to create triage alert:', triageErr);
        }
      }

      // ── 3. Return enriched result ──────────────────────────────────────────
      res.json({
        success: true,
        data: {
          ...aiResult,
          triage_alert_id: triageAlertId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
