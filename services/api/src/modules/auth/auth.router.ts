import { Router, Request, Response } from 'express';

export const authRouter = Router();

/**
 * POST /api/auth/session
 * Exchange Supabase token for a validated session.
 */
authRouter.post('/session', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Auth session endpoint — Phase 2' },
  });
});

/**
 * DELETE /api/auth/session
 * Terminate the current session.
 */
authRouter.delete('/session', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Session termination — Phase 2' },
  });
});
