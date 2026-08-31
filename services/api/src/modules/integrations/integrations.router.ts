import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth';
import { createSupabaseServiceClient } from '../../utils/supabase';
import { createNotFoundError } from '../../middleware/errorHandler';
import { z } from 'zod';

export const integrationsRouter = Router();

// Staff authentication required for ABDM / HIS operations
integrationsRouter.use(requireAuth, requireRole(['ADMIN', 'DOCTOR', 'TRIAGE_STAFF']));

const PushAbdmRecordSchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid(),
  consentArtefactId: z.string().optional(),
});

const PushHisRecordSchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid(),
  hisSystem: z.string().default('OPEN_MRS_MOCK'),
});

/**
 * Generate FHIR R4 Compatible Bundle for ABDM Health Information Exchange
 */
function buildFhirR4Bundle(patient: any, summary: any, session: any) {
  const bundleId = `urn:uuid:${session.id}`;
  const timestamp = new Date().toISOString();

  return {
    resourceType: 'Bundle',
    id: session.id,
    type: 'document',
    timestamp: timestamp,
    identifier: {
      system: 'https://ndhm.gov.in/fhir/bundle-identifier',
      value: `MEDIKIOSK-OPD-${session.id.slice(0, 8).toUpperCase()}`,
    },
    entry: [
      // 1. Patient Resource
      {
        fullUrl: `urn:uuid:${patient.id}`,
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [
            ...(patient.abha_id ? [{ system: 'https://healthid.ndhm.gov.in', value: patient.abha_id }] : []),
            ...(patient.uhid ? [{ system: 'https://hospital.gov.in/uhid', value: patient.uhid }] : []),
          ],
          name: [{ text: `${patient.first_name} ${patient.last_name}` }],
          gender: patient.gender ? patient.gender.toLowerCase() : 'unknown',
          telecom: patient.phone ? [{ system: 'phone', value: patient.phone }] : [],
        },
      },
      // 2. Encounter Resource
      {
        fullUrl: `urn:uuid:${session.id}`,
        resource: {
          resourceType: 'Encounter',
          id: session.id,
          status: 'finished',
          class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'AMB',
            display: 'ambulatory',
          },
          subject: { reference: `urn:uuid:${patient.id}` },
          period: {
            start: session.started_at,
            end: session.completed_at || timestamp,
          },
        },
      },
      // 3. Clinical Summary (Composition / Condition)
      ...(summary
        ? [
            {
              fullUrl: `urn:uuid:${summary.id}`,
              resource: {
                resourceType: 'Condition',
                id: summary.id,
                clinicalStatus: {
                  coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
                },
                subject: { reference: `urn:uuid:${patient.id}` },
                encounter: { reference: `urn:uuid:${session.id}` },
                note: [{ text: summary.chief_complaint_summary || summary.hpi_narrative || '' }],
              },
            },
          ]
        : []),
    ],
  };
}

/**
 * POST /api/integrations/abdm
 * Generate FHIR payload and link care context to ABDM sandbox / mock gateway.
 */
integrationsRouter.post('/abdm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const { patientId, sessionId, consentArtefactId } = PushAbdmRecordSchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
    const { data: session } = await supabase.from('patient_sessions').select('*').eq('id', sessionId).single();
    const { data: summary } = await supabase
      .from('clinical_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (!patient || !session) {
      return next(createNotFoundError('Patient or Session'));
    }

    const fhirBundle = buildFhirR4Bundle(patient, summary, session);
    const transactionId = `ABDM-TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Mock ABDM gateway response
    const mockAbdmResponse = {
      status: 'ACKNOWLEDGED',
      transactionId,
      careContextReference: `MEDIKIOSK-CC-${session.id.slice(0, 8).toUpperCase()}`,
      abhaAddress: patient.abha_id ? `${patient.abha_id}@abdm` : undefined,
      fhirBundleDigest: 'sha256:' + Buffer.from(JSON.stringify(fhirBundle)).toString('hex').slice(0, 32),
      submittedAt: new Date().toISOString(),
      consentArtefactId: consentArtefactId || 'MOCK-CONSENT-001',
    };

    // Record audit trail
    await supabase.from('audit_logs').insert({
      actor_id: authReq.userId,
      actor_role: authReq.userRole,
      patient_id: patientId,
      action: 'ABDM_CARE_CONTEXT_LINKED',
      resource_type: 'abdm_transaction',
      resource_id: session.id,
      details: {
        transactionId,
        abhaId: patient.abha_id,
        isMock: true,
      },
    });

    res.json({
      success: true,
      data: {
        message: 'ABDM Care Context submitted successfully (Sandbox Mock)',
        abdmResponse: mockAbdmResponse,
        fhirBundle,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/integrations/his
 * Push patient consultation record to the Hospital Information System (OpenMRS / FHIR EHR).
 */
integrationsRouter.post('/his', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const { patientId, sessionId, hisSystem } = PushHisRecordSchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
    const { data: session } = await supabase.from('patient_sessions').select('*').eq('id', sessionId).single();
    const { data: summary } = await supabase.from('clinical_summaries').select('*').eq('session_id', sessionId).maybeSingle();

    if (!patient || !session) {
      return next(createNotFoundError('Patient or Session'));
    }

    const hisRecordNumber = `HIS-ENC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const mockHisResponse = {
      status: 'INGESTED',
      hisSystem,
      encounterId: hisRecordNumber,
      patientUhid: patient.uhid || `UHID-${patient.id.slice(0, 8).toUpperCase()}`,
      opdToken: session.opd_token || `OPD-${session.id.slice(0, 8).toUpperCase()}`,
      ingestedAt: new Date().toISOString(),
      summarySnapshot: {
        riskLevel: summary?.risk_level || 'NORMAL',
        chiefComplaint: summary?.chief_complaint_summary || 'N/A',
      },
    };

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: authReq.userId,
      actor_role: authReq.userRole,
      patient_id: patientId,
      action: 'HIS_RECORD_INGESTED',
      resource_type: 'his_encounter',
      resource_id: session.id,
      details: {
        hisSystem,
        encounterId: hisRecordNumber,
        isMock: true,
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Patient encounter pushed to HIS (OpenMRS Mock Adapter)',
        hisResponse: mockHisResponse,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/integrations/his/patient/:identifier
 * Lookup existing patient record in mock HIS by ABHA ID, Phone, or UHID.
 */
integrationsRouter.get('/his/patient/:identifier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.params;
    const supabase = createSupabaseServiceClient();

    // Check DB first for match by abha_id, phone, or uhid
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .or(`abha_id.eq.${identifier},phone.eq.${identifier},uhid.eq.${identifier}`)
      .maybeSingle();

    if (patient) {
      return res.json({
        success: true,
        data: {
          source: 'LOCAL_EHR_CACHE',
          patient,
        },
      });
    }

    // Return synthetic HIS demographic match if identifier is valid 14 digits or 10 digits
    if (/^\d{14}$/.test(identifier.replace(/[\s-]/g, ''))) {
      return res.json({
        success: true,
        data: {
          source: 'MOCK_ABDM_REGISTRY',
          patient: {
            abhaId: identifier,
            firstName: 'Aarav',
            lastName: 'Sharma',
            age: 34,
            gender: 'MALE',
            phone: '9876500003',
            preferredLanguage: 'hi',
          },
        },
      });
    }

    res.json({
      success: true,
      data: null,
    });
  } catch (err) {
    next(err);
  }
});
