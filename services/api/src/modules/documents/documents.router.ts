import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';

export const documentsRouter = Router();

/**
 * POST /api/documents
 * Upload a medical document (multipart/form-data).
 */
documentsRouter.post('/', async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Document upload — Phase 4' },
  });
});

/**
 * GET /api/documents/:id
 * Get document metadata and extracted entities.
 */
documentsRouter.get('/:id', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Get document — Phase 4' },
  });
});

/**
 * POST /api/documents/:id/process
 * Trigger AI processing (OCR + entity extraction) via ai-documents service.
 */
documentsRouter.post('/:id/process', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Process document with AI — Phase 4' },
  });
});

/**
 * GET /api/documents/:id/download
 * Get a signed URL to download a document from Supabase Storage.
 */
documentsRouter.get('/:id/download', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Document download URL — Phase 4' },
  });
});
