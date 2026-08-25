import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.router';
import { patientsRouter } from '../modules/patients/patients.router';
import { consentRouter } from '../modules/consent/consent.router';
import { historyRouter } from '../modules/history/history.router';
import { documentsRouter } from '../modules/documents/documents.router';
import { summaryRouter } from '../modules/summary/summary.router';
import { doctorRouter } from '../modules/doctor/doctor.router';
import { triageRouter } from '../modules/triage/triage.router';
import { integrationsRouter } from '../modules/integrations/integrations.router';

export const router = Router();

// Mount all module routers
router.use('/auth', authRouter);
router.use('/patients', patientsRouter);
router.use('/consents', consentRouter);
router.use('/history', historyRouter);
router.use('/documents', documentsRouter);
router.use('/summaries', summaryRouter);
router.use('/doctor', doctorRouter);
router.use('/triage', triageRouter);
router.use('/integrations', integrationsRouter);
