import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';

export const historyRouter = Router();

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
 * Trigger AI processing of history answers via ai-history service.
 */
historyRouter.post('/sessions/:id/process', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Process history with AI — Phase 3' },
  });
});
