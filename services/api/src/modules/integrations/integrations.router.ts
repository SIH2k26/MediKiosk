import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';

export const integrationsRouter = Router();

integrationsRouter.use(requireAuth, requireRole(['ADMIN', 'DOCTOR']));

/**
 * POST /api/integrations/abdm
 * Send patient data to ABDM (Ayushman Bharat Digital Mission).
 */
integrationsRouter.post('/abdm', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'ABDM integration — Phase 7' },
  });
});

/**
 * POST /api/integrations/his
 * Push patient record to the Hospital Information System.
 */
integrationsRouter.post('/his', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'HIS integration — Phase 7' },
  });
});

/**
 * GET /api/integrations/his/patient/:abhaId
 * Lookup existing patient record in HIS by ABHA ID.
 */
integrationsRouter.get('/his/patient/:abhaId', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'HIS patient lookup — Phase 7' },
  });
});
