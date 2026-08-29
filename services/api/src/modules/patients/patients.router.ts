import { Router, Request, Response } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { requireAuth, requireRole } from '../../middleware/auth';
import { CreatePatientSchema } from '@medikiosk/clinical-schema';
import { createSupabaseServerClient, createSupabaseServiceClient } from '../../utils/supabase';
import { createNotFoundError } from '../../middleware/errorHandler';
import { sendOtpSms, getSmsProvider } from '../../utils/sms';

export const patientsRouter = Router();

// DB Mapping Helper Functions
function mapToSnakeCase(patient: any) {
  return {
    first_name: patient.firstName,
    last_name: patient.lastName,
    date_of_birth: patient.dateOfBirth,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    preferred_language: patient.preferredLanguage,
    abha_id: patient.abhaId,
    uhid: patient.uhid,
    is_anonymous: patient.isAnonymous,
  };
}

function mapToCamelCase(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    profileId: row.profile_id,
    abhaId: row.abha_id,
    uhid: row.uhid,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    address: row.address,
    preferredLanguage: row.preferred_language,
    isAnonymous: row.is_anonymous,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/patients/search
 * Search patients by ABHA ID, UHID, Phone, or Name (doctor/admin/triage only).
 * MUST be registered before /:id route so 'search' is not parsed as a UUID.
 */
patientsRouter.get(
  '/search',
  requireAuth,
  requireRole(['DOCTOR', 'TRIAGE_STAFF', 'ADMIN']),
  async (req: Request, res: Response, next) => {
    try {
      const query = req.query.query;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Search query parameter is required' },
        });
      }

      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`phone.eq.${query},abha_id.eq.${query},uhid.eq.${query},first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);

      if (error) return next(error);

      res.json({
        success: true,
        data: data ? data.map(mapToCamelCase) : [],
      });
    } catch (err) {
      next(err);
    }
  }
);

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_LIMIT_MAX_SENDS = 3;

/** OTP codes are stored hashed — never in plain text. */
function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function otpMatches(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtp(code));
  const stored = Buffer.from(storedHash);
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

/**
 * POST /api/patients/otp/send
 * Generate an OTP for optional phone verification during kiosk onboarding.
 * Delivery uses the configured SMS provider (MSG91 / Twilio / MOCK).
 * With the MOCK provider (development), the code is returned as devCode.
 * MUST be registered before /:id route.
 */
patientsRouter.post('/otp/send', async (req: Request, res: Response, next) => {
  try {
    const { phone } = req.body || {};
    if (typeof phone !== 'string' || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'A valid 10-digit Indian mobile number is required' },
      });
    }

    const supabase = createSupabaseServiceClient();

    // Rate limit: max OTP sends per phone within the window (prevents SMS abuse)
    const windowStart = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentSends } = await supabase
      .from('otp_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('created_at', windowStart);
    if ((recentSends ?? 0) >= OTP_RATE_LIMIT_MAX_SENDS) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many OTP requests. Please try again later.' },
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Invalidate previous unverified OTPs for this phone
    await supabase
      .from('otp_verifications')
      .update({ expires_at: new Date().toISOString() })
      .eq('phone', phone)
      .eq('verified', false);

    const { error } = await supabase.from('otp_verifications').insert({
      phone,
      code: hashOtp(code), // stored hashed
      expires_at: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(),
    });
    if (error) return next(error);

    // Deliver via the configured provider (throws on gateway failure)
    await sendOtpSms(phone, code);

    // Only expose the code with the MOCK provider outside production
    const exposeDevCode = getSmsProvider() === 'MOCK' && process.env.NODE_ENV !== 'production';
    res.status(201).json({
      success: true,
      data: {
        sent: true,
        expiresInSeconds: OTP_EXPIRY_MS / 1000,
        ...(exposeDevCode ? { devCode: code } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/patients/otp/verify
 * Verify an OTP previously sent to a phone number.
 */
patientsRouter.post('/otp/verify', async (req: Request, res: Response, next) => {
  try {
    const { phone, code } = req.body || {};
    if (typeof phone !== 'string' || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'phone and code are required' },
      });
    }

    const supabase = createSupabaseServiceClient();
    const { data: otp, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return next(error);

    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(400).json({
        success: false,
        error: { code: 'OTP_INVALID', message: 'OTP expired or too many attempts. Request a new one.' },
      });
    }

    if (!otpMatches(code, otp.code)) {
      await supabase
        .from('otp_verifications')
        .update({ attempts: otp.attempts + 1 })
        .eq('id', otp.id);
      return res.status(400).json({
        success: false,
        error: { code: 'OTP_INCORRECT', message: 'Incorrect OTP. Please try again.' },
      });
    }

    await supabase.from('otp_verifications').update({ verified: true }).eq('id', otp.id);

    res.json({ success: true, data: { verified: true } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/patients
 * Register a new patient (kiosk walk-in or ABHA-linked).
 * Safe for unauthenticated kiosk usage.
 */
patientsRouter.post('/', async (req: Request, res: Response, next) => {
  try {
    const validatedData = CreatePatientSchema.parse(req.body);
    const supabase = createSupabaseServiceClient(); // Use service role client to bypass RLS for registration

    let existingPatient = null;

    if (validatedData.abhaId) {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('abha_id', validatedData.abhaId)
        .maybeSingle();
      existingPatient = data;
    } else if (validatedData.phone && !validatedData.isAnonymous) {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('phone', validatedData.phone)
        .eq('is_anonymous', false)
        .maybeSingle();
      existingPatient = data;
    }

    if (existingPatient) {
      return res.status(200).json({
        success: true,
        data: mapToCamelCase(existingPatient),
      });
    }

    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert(mapToSnakeCase(validatedData))
      .select('*')
      .single();

    if (error) return next(error);

    res.status(201).json({
      success: true,
      data: mapToCamelCase(newPatient),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patients/:id
 * Get patient record by ID.
 */
patientsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return next(error);
    if (!data) return next(createNotFoundError('Patient'));

    res.json({
      success: true,
      data: mapToCamelCase(data),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/patients/:id
 * Update patient information.
 */
patientsRouter.patch('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const validatedData = CreatePatientSchema.partial().parse(req.body);
    const supabase = createSupabaseServerClient();

    // Map properties to snake_case for PostgreSQL updates
    const updateData: Record<string, any> = {};
    if (validatedData.firstName) updateData.first_name = validatedData.firstName;
    if (validatedData.lastName) updateData.last_name = validatedData.lastName;
    if (validatedData.dateOfBirth) updateData.date_of_birth = validatedData.dateOfBirth;
    if (validatedData.age !== undefined) updateData.age = validatedData.age;
    if (validatedData.gender) updateData.gender = validatedData.gender;
    if (validatedData.phone) updateData.phone = validatedData.phone;
    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.address) updateData.address = validatedData.address;
    if (validatedData.preferredLanguage) updateData.preferred_language = validatedData.preferredLanguage;
    if (validatedData.abhaId) updateData.abha_id = validatedData.abhaId;
    if (validatedData.uhid) updateData.uhid = validatedData.uhid;
    if (validatedData.isAnonymous !== undefined) updateData.is_anonymous = validatedData.isAnonymous;

    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return next(error);
    if (!data) return next(createNotFoundError('Patient'));

    res.json({
      success: true,
      data: mapToCamelCase(data),
    });
  } catch (err) {
    next(err);
  }
});
