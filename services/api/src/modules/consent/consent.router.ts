import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';

export const consentRouter = Router();

/**
 * POST /api/consents
 * Record patient consent grant.
 */
consentRouter.post('/', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Record consent — Phase 2' },
  });
});

/**
 * GET /api/consents/:patientId
 * Get consent records for a patient.
 */
consentRouter.get('/:patientId', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Get consent — Phase 2' },
  });
});

/**
 * DELETE /api/consents/:id
 * Revoke consent.
 */
consentRouter.delete('/:id', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Revoke consent — Phase 2' },
  });
});
