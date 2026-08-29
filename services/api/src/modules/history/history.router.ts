/**
 * History Router — /api/history
 *
 * POST /sessions/:id/process:
 *   Forwards answers to the ai-history Python service for extraction + red-flag
 *   detection. If the response carries risk_level >= WARNING, a triage alert
 *   is created in Supabase via TriageService (idempotent — retries are safe).
 *   Supabase Realtime then broadcasts the INSERT to subscribed frontends.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import { AuthRequest } from '../../middleware/auth';
import { HttpError } from '../../middleware/errorHandler';
import { triageService } from '../triage/triage.service';
import { RiskLevel } from '@medikiosk/shared-types';

export const historyRouter = Router();

const AI_HISTORY_URL = process.env.AI_HISTORY_URL ?? 'http://localhost:8001';

// Risk levels that trigger a triage alert
const ALERT_RISK_LEVELS: RiskLevel[] = ['WARNING', 'HIGH_PRIORITY', 'EMERGENCY'];

// Map Python RiskLevel → priority_score for the DB column
const PRIORITY_SCORE: Record<RiskLevel, number> = {
  NORMAL:        0,
  WARNING:       50,
  HIGH_PRIORITY: 75,
  EMERGENCY:     100,
};

/**
 * POST /api/history/sessions
 * Start a new clinical history session.
 */
historyRouter.post('/sessions', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Start history session — Phase 3' },
  });
});

/**
 * POST /api/history/sessions/:id/answers
 * Submit answers for a history section.
 */
historyRouter.post('/sessions/:id/answers', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Submit history answers — Phase 3' },
  });
});

/**
 * GET /api/history/sessions/:id
 * Get a specific history session.
 */
historyRouter.get('/sessions/:id', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Get history session — Phase 3' },
  });
});

/**
 * GET /api/history/:patientId
 * Get complete clinical history for a patient.
 */
historyRouter.get('/:patientId', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Get patient history — Phase 3' },
  });
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
  requireAuth,
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

      if (ALERT_RISK_LEVELS.includes(riskLevel)) {
        try {
          const triage = aiResult.triage_classification;
          const alert = await triageService.createAlert({
            patient_id: body.patient_id,
            session_id: sessionId,
            section_type: body.section_type,
            risk_level: riskLevel,
            red_flags: aiResult.red_flags ?? [],
            priority_score: PRIORITY_SCORE[riskLevel],
            clinical_category: triage?.clinical_categories?.[0] ?? undefined,
            suggested_action: triage?.protocol_action ?? undefined,
            time_to_intervention_minutes: triage?.time_to_intervention_minutes ?? undefined,
          });

          triageAlertId = alert.id;

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
          // Log it and continue — clinical safety means we return the AI result.
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
