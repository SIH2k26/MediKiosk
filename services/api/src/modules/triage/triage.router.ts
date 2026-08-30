/**
 * Triage Router — /api/triage
 *
 * Security model:
 *   - All routes require JWT auth (requireAuth).
 *   - POST /alerts is INTERNAL_ONLY: only callable by the Express server itself
 *     (history.router → triageService.createAlert). It is NOT exposed for
 *     external clients — not even authenticated ones. We enforce this by
 *     checking a server-side header; no frontend can forge it without access
 *     to the INTERNAL_API_SECRET env var.
 *   - All other routes require DOCTOR | TRIAGE_STAFF | ADMIN roles.
 *
 * Idempotency:
 *   The upsert in triageService.createAlert handles retried requests without
 *   creating duplicate alerts (unique index on session_id + section_type).
 *
 * Realtime:
 *   Mutations write to triage_alerts which has Realtime enabled (migration 002).
 *   Frontend clients receive INSERT/UPDATE events through their Supabase
 *   anon-key subscriptions (RLS-filtered to DOCTOR | TRIAGE_STAFF | ADMIN).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth';
import { HttpError } from '../../middleware/errorHandler';
import { triageService } from './triage.service';
import { AlertFilters } from './triage.types';
import { AlertStatus, RiskLevel } from '@medikiosk/shared-types';

export const triageRouter = Router();

triageRouter.use(requireAuth);

// ── Internal-only guard ──────────────────────────────────────────────────────
// POST /api/triage/alerts is called by the history router, not by external
// clients.  A shared secret in the request header prevents external callers
// from creating arbitrary alerts even if they hold a valid JWT.
function requireInternalSecret(req: Request, _res: Response, next: NextFunction): void {
  const secret = req.headers['x-internal-api-secret'];
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || secret !== expected) {
    return next(new HttpError(403, 'FORBIDDEN', 'Internal endpoint'));
  }
  next();
}

// ── GET /api/triage/alerts ───────────────────────────────────────────────────
/**
 * List triage alerts ordered by priority_score DESC.
 * Query params: alert_status, risk_level, is_acknowledged, session_id,
 *               patient_id, limit (max 100), offset
 */
triageRouter.get(
  '/alerts',
  requireAuth,
  requireRole(['DOCTOR', 'TRIAGE_STAFF', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        alert_status, risk_level, is_acknowledged,
        session_id, patient_id, limit, offset,
      } = req.query;

      const filters: AlertFilters = {
        alert_status: alert_status as AlertStatus | undefined,
        risk_level: risk_level as RiskLevel | undefined,
        is_acknowledged:
          is_acknowledged === 'true' ? true :
          is_acknowledged === 'false' ? false :
          undefined,
        session_id: session_id as string | undefined,
        patient_id: patient_id as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      };

      const { items, total } = await triageService.getAlerts(filters);

      res.json({
        success: true,
        data: items,
        meta: {
          total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/triage/alerts (INTERNAL ONLY) ──────────────────────────────────
/**
 * Create a triage alert. Called by the history router after AI processing
 * detects red flags. NOT accessible by external API clients.
 */
triageRouter.post(
  '/alerts',
  requireInternalSecret,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await triageService.createAlert(req.body);
      res.status(201).json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/triage/alerts/:id ───────────────────────────────────────────────
triageRouter.get(
  '/alerts/:id',
  requireAuth,
  requireRole(['DOCTOR', 'TRIAGE_STAFF', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await triageService.getAlertById(req.params.id);
      res.json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/triage/alerts/:id/acknowledge ──────────────────────────────────
triageRouter.post(
  '/alerts/:id/acknowledge',
  requireAuth,
  requireRole(['DOCTOR', 'TRIAGE_STAFF']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const acknowledged_by = authReq.userId;
      if (!acknowledged_by) return next(new HttpError(401, 'UNAUTHORIZED', 'No user ID'));

      const alert = await triageService.acknowledgeAlert(req.params.id, { acknowledged_by });

      // Audit log (fire-and-forget)
      triageService.insertAuditLog({
        actor_id: acknowledged_by,
        actor_role: authReq.userRole ?? 'TRIAGE_STAFF',
        patient_id: alert.patient_id,
        action: 'TRIAGE_ALERT_ACKNOWLEDGED',
        resource_type: 'triage_alert',
        resource_id: alert.id,
        details: { alert_status: 'ACKNOWLEDGED', risk_level: alert.risk_level },
      });

      res.json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/triage/alerts/:id/resolve ──────────────────────────────────────
triageRouter.post(
  '/alerts/:id/resolve',
  requireAuth,
  requireRole(['DOCTOR', 'TRIAGE_STAFF']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const resolved_by = authReq.userId;
      if (!resolved_by) return next(new HttpError(401, 'UNAUTHORIZED', 'No user ID'));

      const { resolution_notes } = req.body;
      if (!resolution_notes || typeof resolution_notes !== 'string') {
        return next(new HttpError(400, 'VALIDATION_ERROR', 'resolution_notes is required'));
      }

      const alert = await triageService.resolveAlert(req.params.id, {
        resolved_by,
        resolution_notes,
      });

      triageService.insertAuditLog({
        actor_id: resolved_by,
        actor_role: authReq.userRole ?? 'TRIAGE_STAFF',
        patient_id: alert.patient_id,
        action: 'TRIAGE_ALERT_RESOLVED',
        resource_type: 'triage_alert',
        resource_id: alert.id,
        details: { resolution_notes, risk_level: alert.risk_level },
      });

      res.json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/triage/alerts/:id/escalate ─────────────────────────────────────
triageRouter.post(
  '/alerts/:id/escalate',
  requireAuth,
  requireRole(['DOCTOR', 'TRIAGE_STAFF']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const escalated_by = authReq.userId;
      if (!escalated_by) return next(new HttpError(401, 'UNAUTHORIZED', 'No user ID'));

      const { escalation_notes } = req.body;
      if (!escalation_notes || typeof escalation_notes !== 'string') {
        return next(new HttpError(400, 'VALIDATION_ERROR', 'escalation_notes is required'));
      }

      const alert = await triageService.escalateAlert(req.params.id, {
        escalated_by,
        escalation_notes,
      });

      triageService.insertAuditLog({
        actor_id: escalated_by,
        actor_role: authReq.userRole ?? 'TRIAGE_STAFF',
        patient_id: alert.patient_id,
        action: 'TRIAGE_ALERT_ESCALATED',
        resource_type: 'triage_alert',
        resource_id: alert.id,
        details: { escalation_notes, risk_level: alert.risk_level },
      });

      res.json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
);
