import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';

export const summaryRouter = Router();

/**
 * POST /api/summaries/generate
 * Generate a clinical summary for a patient session.
 */
summaryRouter.post('/generate', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Generate summary — Phase 5' },
  });
});

/**
 * GET /api/summaries/:patientId
 * Get clinical summaries for a patient.
 */
summaryRouter.get('/:patientId', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Get summaries — Phase 5' },
  });
});

/**
 * PATCH /api/summaries/:id
 * Doctor updates/confirms a summary.
 */
summaryRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['DOCTOR']),
  async (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Update summary — Phase 5' },
    });
  }
);
