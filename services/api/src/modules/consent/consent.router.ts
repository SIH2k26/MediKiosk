import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { CreateConsentSchema } from '@medikiosk/clinical-schema';
import { createSupabaseServerClient, createSupabaseServiceClient } from '../../utils/supabase';
import { createNotFoundError } from '../../middleware/errorHandler';

export const consentRouter = Router();

// DB Mapping Helper Functions
function mapToSnakeCase(consent: any, ipAddress?: string) {
  return {
    patient_id: consent.patientId,
    session_id: consent.sessionId,
    consent_version: consent.consentVersion,
    audio_confirmation_url: consent.audioConfirmationUrl,
    status: 'GRANTED',
    granted_at: new Date().toISOString(),
    ip_address: ipAddress,
  };
}

function mapToCamelCase(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    patientId: row.patient_id,
    sessionId: row.session_id,
    status: row.status,
    consentVersion: row.consent_version,
    grantedAt: row.granted_at,
    revokedAt: row.revoked_at,
    ipAddress: row.ip_address,
    audioConfirmationUrl: row.audio_confirmation_url,
  };
}

/**
 * POST /api/consents
 * Record patient consent grant.
 * Accessible without auth for kiosk patient onboarding.
 */
consentRouter.post('/', async (req: Request, res: Response, next) => {
  try {
    const validatedData = CreateConsentSchema.parse(req.body);
    const supabase = createSupabaseServiceClient(); // Use service role to bypass RLS for registration

    const clientIp = req.ip || req.socket.remoteAddress;

    const { data, error } = await supabase
      .from('consents')
      .insert(mapToSnakeCase(validatedData, clientIp))
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
 * GET /api/consents/:patientId
 * Get consent records for a patient.
 */
consentRouter.get('/:patientId', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { patientId } = req.params;
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('consents')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) return next(error);

    res.json({
      success: true,
      data: data ? data.map(mapToCamelCase) : [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/consents/:id
 * Revoke consent.
 */
consentRouter.delete('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('consents')
      .update({
        status: 'REVOKED',
        revoked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return next(error);
    if (!data) return next(createNotFoundError('Consent'));

    res.json({
      success: true,
      data: mapToCamelCase(data),
    });
  } catch (err) {
    next(err);
  }
});
