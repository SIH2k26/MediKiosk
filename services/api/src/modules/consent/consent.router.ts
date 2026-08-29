import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { CreateConsentSchema } from '@medikiosk/clinical-schema';
import { createSupabaseServerClient, createSupabaseServiceClient } from '../../utils/supabase';
import { createNotFoundError } from '../../middleware/errorHandler';

export const consentRouter = Router();

// DB Mapping Helper Functions
function mapToSnakeCase(consent: any, status: string, ipAddress?: string) {
  return {
    patient_id: consent.patientId,
    session_id: consent.sessionId,
    consent_version: consent.consentVersion,
    audio_confirmation_url: consent.audioConfirmationUrl,
    status,
    granted_at: status === 'GRANTED' ? new Date().toISOString() : null,
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

/** Append an immutable consent audit record. Failures are non-fatal. */
async function logConsentAudit(supabase: any, action: string, row: any, req: Request) {
  await supabase.from('audit_logs').insert({
    patient_id: row.patient_id,
    action,
    resource_type: 'consent',
    resource_id: row.id,
    details: { sessionId: row.session_id, consentVersion: row.consent_version },
    ip_address: req.ip || req.socket.remoteAddress,
    user_agent: req.headers['user-agent'],
  });
}

/**
 * GET /api/consents/versions/active?language=hi
 * Fetch the active consent document for a language (falls back to English).
 * Public: needed by the kiosk before any consent exists.
 * MUST be registered before /:patientId.
 */
consentRouter.get('/versions/active', async (req: Request, res: Response, next) => {
  try {
    const language = typeof req.query.language === 'string' ? req.query.language : 'en';
    const supabase = createSupabaseServiceClient();

    let { data, error } = await supabase
      .from('consent_versions')
      .select('version, language, title, body, audio_url')
      .eq('language', language)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return next(error);

    if (!data && language !== 'en') {
      const fallback = await supabase
        .from('consent_versions')
        .select('version, language, title, body, audio_url')
        .eq('language', 'en')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallback.error) return next(fallback.error);
      data = fallback.data;
    }

    if (!data) return next(createNotFoundError('Active consent version'));

    res.json({
      success: true,
      data: {
        version: data.version,
        language: data.language,
        title: data.title,
        body: data.body,
        audioUrl: data.audio_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

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
      .insert(mapToSnakeCase(validatedData, 'GRANTED', clientIp))
      .select('*')
      .single();

    if (error) return next(error);

    await logConsentAudit(supabase, 'CONSENT_GRANTED', data, req);

    res.status(201).json({
      success: true,
      data: mapToCamelCase(data),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/consents/decline
 * Record an explicit consent rejection (kept for audit purposes).
 * Accessible without auth for kiosk patient onboarding.
 */
consentRouter.post('/decline', async (req: Request, res: Response, next) => {
  try {
    const validatedData = CreateConsentSchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    const clientIp = req.ip || req.socket.remoteAddress;

    const { data, error } = await supabase
      .from('consents')
      .insert(mapToSnakeCase(validatedData, 'DECLINED', clientIp))
      .select('*')
      .single();

    if (error) return next(error);

    await logConsentAudit(supabase, 'CONSENT_DECLINED', data, req);

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
    const supabase = createSupabaseServiceClient();

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

    await logConsentAudit(supabase, 'CONSENT_REVOKED', data, req);

    res.json({
      success: true,
      data: mapToCamelCase(data),
    });
  } catch (err) {
    next(err);
  }
});
