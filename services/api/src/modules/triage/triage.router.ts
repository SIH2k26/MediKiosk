import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';

export const triageRouter = Router();

triageRouter.use(requireAuth);

/**
 * GET /api/triage/alerts
 * Get active triage alerts (ordered by risk level).
 */
triageRouter.get('/alerts', requireRole(['DOCTOR', 'TRIAGE_STAFF', 'ADMIN']), async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Get triage alerts — Phase 6' },
  });
});

/**
 * POST /api/triage/alerts/:id/acknowledge
 * Acknowledge a triage alert.
 */
triageRouter.post('/alerts/:id/acknowledge', requireRole(['DOCTOR', 'TRIAGE_STAFF']), async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Acknowledge triage alert — Phase 6' },
  });
});
