import { Router, Request, Response } from 'express';
import { createSupabaseServiceClient } from '../../utils/supabase';
import { createNotFoundError } from '../../middleware/errorHandler';
import { z } from 'zod';

export const authRouter = Router();

const StartSessionSchema = z.object({
  patientId: z.string().uuid(),
  kioskId: z.string().optional(),
  language: z.enum(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa']).default('hi'),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateSessionStatusSchema = z.object({
  status: z.enum(['COMPLETED', 'ABANDONED', 'EXPIRED']),
});

function mapToSnakeCase(session: any, opdToken?: string) {
  return {
    patient_id: session.patientId,
    kiosk_id: session.kioskId,
    language: session.language,
    metadata: session.metadata,
    status: 'ACTIVE',
    opd_token: opdToken,
    started_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
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
    opdToken: row.opd_token,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    lastActivityAt: row.last_activity_at,
    metadata: row.metadata,
  };
}

/**
 * POST /api/auth/session
 * Initiate a patient kiosk intake session and issue an OPD queue token.
 */
authRouter.post('/session', async (req: Request, res: Response, next) => {
  try {
    const validatedData = StartSessionSchema.parse(req.body);
    const supabase = createSupabaseServiceClient(); // Service role client to bypass RLS for session creation

    // Generate a sequential OPD token (e.g. OPD-20260829-0042)
    const { data: opdToken, error: tokenError } = await supabase.rpc('generate_opd_token');
    if (tokenError) return next(tokenError);

    const { data, error } = await supabase
      .from('patient_sessions')
      .insert(mapToSnakeCase(validatedData, opdToken as string))
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
 * PATCH /api/auth/session/:id/status
 * Transition a session to COMPLETED, ABANDONED, or EXPIRED.
 * Called by the kiosk on completion, inactivity timeout, or manual reset.
 */
authRouter.patch('/session/:id/status', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { status } = UpdateSessionStatusSchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    const update: Record<string, any> = { status };
    if (status === 'COMPLETED') update.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('patient_sessions')
      .update(update)
      .eq('id', id)
      .eq('status', 'ACTIVE') // Only ACTIVE sessions may transition
      .select('*')
      .maybeSingle();

    if (error) return next(error);
    if (!data) return next(createNotFoundError('Active session'));

    res.json({
      success: true,
      data: mapToCamelCase(data),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/session/:id/heartbeat
 * Record kiosk activity so idle sessions can be expired server-side.
 */
authRouter.post('/session/:id/heartbeat', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('patient_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'ACTIVE')
      .select('id, status, expires_at')
      .maybeSingle();

    if (error) return next(error);
    if (!data) return next(createNotFoundError('Active session'));

    res.json({ success: true, data: { id: data.id, status: data.status, expiresAt: data.expires_at } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/session/:id
 * Terminate a session (marks it COMPLETED).
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
