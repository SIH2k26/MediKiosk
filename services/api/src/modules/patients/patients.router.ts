import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';

export const patientsRouter = Router();

/**
 * POST /api/patients
 * Register a new patient (kiosk walk-in or ABHA-linked).
 */
patientsRouter.post('/', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Patient registration — Phase 2' },
  });
});

/**
 * GET /api/patients/:id
 * Get patient record by ID.
 */
patientsRouter.get('/:id', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Get patient — Phase 2' },
  });
});

/**
 * PATCH /api/patients/:id
 * Update patient information.
 */
patientsRouter.patch('/:id', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Update patient — Phase 2' },
  });
});

/**
 * GET /api/patients/search
 * Search patients by ABHA ID, UHID, or name (doctor/admin only).
 */
patientsRouter.get('/search', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Patient search — Phase 2' },
  });
});
