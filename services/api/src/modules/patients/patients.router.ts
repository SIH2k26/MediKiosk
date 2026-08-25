import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { CreatePatientSchema } from '@medikiosk/clinical-schema';
import { createSupabaseServerClient, createSupabaseServiceClient } from '../../utils/supabase';
import { createNotFoundError } from '../../middleware/errorHandler';

export const patientsRouter = Router();

// DB Mapping Helper Functions
function mapToSnakeCase(patient: any) {
  return {
    profile_id: patient.profileId,
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

// Local helper to optionally check bearer tokens without throwing
async function getAuthUser(req: Request): Promise<any | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
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

/**
 * POST /api/patients
 * Register a new patient (kiosk walk-in or ABHA-linked).
 * Safe for unauthenticated kiosk usage, or optionally authenticated.
 */
patientsRouter.post('/', async (req: Request, res: Response, next) => {
  try {
    const validatedData = CreatePatientSchema.parse(req.body);
    const serviceClient = createSupabaseServiceClient(); // Service role client to write profiles/patients

    // 1. Check if user is authenticated (registered/logged in via Supabase Auth)
    const authUser = await getAuthUser(req);
    let profileId: string | undefined = undefined;

    if (authUser) {
      // Create or get profile for the authenticated user
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (profile) {
        profileId = profile.id;
      } else {
        const { data: newProfile, error: insertError } = await serviceClient
          .from('profiles')
          .insert({
            user_id: authUser.id,
            role: 'PATIENT',
            full_name: `${validatedData.firstName} ${validatedData.lastName}`,
            email: authUser.email,
            phone: validatedData.phone,
          })
          .select('id')
          .single();

        if (insertError) return next(insertError);
        profileId = newProfile.id;
      }
    }

    // 2. Check if patient record already exists
    let existingPatient = null;

    if (profileId) {
      const { data } = await serviceClient
        .from('patients')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();
      existingPatient = data;
    } else if (validatedData.abhaId) {
      const { data } = await serviceClient
        .from('patients')
        .select('*')
        .eq('abha_id', validatedData.abhaId)
        .maybeSingle();
      existingPatient = data;
    } else if (validatedData.phone && !validatedData.isAnonymous) {
      const { data } = await serviceClient
        .from('patients')
        .select('*')
        .eq('phone', validatedData.phone)
        .eq('is_anonymous', false)
        .maybeSingle();
      existingPatient = data;
    }

    // 3. Handle matching/updating existing patients
    if (existingPatient) {
      const isPlaceholder =
        existingPatient.first_name === 'Walk-in' ||
        existingPatient.first_name === 'आगंतुक' ||
        existingPatient.first_name === 'Kiosk' ||
        existingPatient.first_name === 'कियोस्क';

      const incomingIsReal =
        validatedData.firstName !== 'Walk-in' &&
        validatedData.firstName !== 'आगंतुक' &&
        validatedData.firstName !== 'Kiosk' &&
        validatedData.firstName !== 'कियोस्क';

      const updatePayload = mapToSnakeCase(validatedData);
      if (profileId) {
        updatePayload.profile_id = profileId;
      }

      if (isPlaceholder && incomingIsReal) {
        const { data: updatedPatient, error: updateError } = await serviceClient
          .from('patients')
          .update(updatePayload)
          .eq('id', existingPatient.id)
          .select('*')
          .single();

        if (updateError) return next(updateError);

        return res.status(200).json({
          success: true,
          data: mapToCamelCase(updatedPatient),
        });
      }

      // Link profile if newly authenticated
      if (profileId && !existingPatient.profile_id) {
        const { data: updatedPatient } = await serviceClient
          .from('patients')
          .update({ profile_id: profileId })
          .eq('id', existingPatient.id)
          .select('*')
          .single();
        existingPatient = updatedPatient;
      }

      return res.status(200).json({
        success: true,
        data: mapToCamelCase(existingPatient),
      });
    }

    // 4. Create new patient record
    const insertPayload = mapToSnakeCase(validatedData);
    if (profileId) {
      insertPayload.profile_id = profileId;
    }

    const { data: newPatient, error } = await serviceClient
      .from('patients')
      .insert(insertPayload)
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
