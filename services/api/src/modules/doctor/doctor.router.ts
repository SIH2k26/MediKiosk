import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';

export const doctorRouter = Router();

// All doctor routes require authentication and DOCTOR/TRIAGE_STAFF role
doctorRouter.use(requireAuth);

/**
 * GET /api/doctor/queue
 * Get today's OPD queue with patient summaries and risk levels.
 */
doctorRouter.get('/queue', requireRole(['DOCTOR', 'TRIAGE_STAFF']), async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Doctor queue — Phase 6' },
  });
});

/**
 * GET /api/doctor/patients/:id
 * Get a specific patient's full clinical record for the doctor portal.
 */
doctorRouter.get('/patients/:id', requireRole(['DOCTOR']), async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Doctor patient view — Phase 6' },
  });
});

/**
 * POST /api/doctor/reviews
 * Submit a doctor review of an AI-generated clinical summary.
 */
doctorRouter.post('/reviews', requireRole(['DOCTOR']), async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Doctor review — Phase 6' },
  });
});

/**
 * GET /api/doctor/patients/:id/timeline
 * Get the patient's medical timeline.
 */
doctorRouter.get('/patients/:id/timeline', requireRole(['DOCTOR']), async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Patient timeline — Phase 6' },
  });
});
