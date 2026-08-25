import { Router, Request, Response } from 'express';
import { createSupabaseServiceClient } from '../../utils/supabase';
import { z } from 'zod';

export const authRouter = Router();

const StartSessionSchema = z.object({
  patientId: z.string().uuid(),
  kioskId: z.string().optional(),
  language: z.enum(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa']).default('hi'),
  metadata: z.record(z.unknown()).optional(),
});

function mapToSnakeCase(session: any) {
  return {
    patient_id: session.patientId,
    kiosk_id: session.kioskId,
    language: session.language,
    metadata: session.metadata,
    status: 'ACTIVE',
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours expiration
  };
}

function mapToCamelCase(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    kioskId: row.kiosk_id,
    status: row.status,
    language: row.language,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    metadata: row.metadata,
  };
}

/**
 * POST /api/auth/session
 * Initiate a patient kiosk intake session.
 */
authRouter.post('/session', async (req: Request, res: Response, next) => {
  try {
    const validatedData = StartSessionSchema.parse(req.body);
    const supabase = createSupabaseServiceClient(); // Service role client to bypass RLS for session creation

    const { data, error } = await supabase
      .from('patient_sessions')
      .insert(mapToSnakeCase(validatedData))
      .select('*')
      .single();

    if (error) return next(error);

    res.status(201).json({
      success: true,
      data: mapToCamelCase(data),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/session/:id
 * Terminate a session.
 */
authRouter.delete('/session/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('patient_sessions')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return next(error);

    res.json({
      success: true,
      data: mapToCamelCase(data),
    });
  } catch (err) {
    next(err);
  }
});
