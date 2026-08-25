/**
 * OpenAPI 3.0 specification for the MediKiosk API.
 * Served at GET /api/openapi.json
 * UI available at GET /api/docs
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MediKiosk API',
    description:
      'AI-Powered Clinical History & Patient Intake Platform — Backend API\n\n' +
      '> **All AI-generated clinical information must be reviewed by a qualified physician.**',
    version: '0.1.0',
    contact: {
      name: 'MediKiosk Team',
    },
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Development' },
    { url: 'https://api.medikiosk.example.com', description: 'Production' },
  ],
  tags: [
    { name: 'auth', description: 'Authentication & session management' },
    { name: 'patients', description: 'Patient registration & lookup' },
    { name: 'consent', description: 'Patient consent management' },
    { name: 'history', description: 'Clinical history collection (conversational AI)' },
    { name: 'documents', description: 'Medical document upload & AI processing' },
    { name: 'summaries', description: 'AI-generated clinical summaries' },
    { name: 'doctor', description: 'Doctor portal — queue, review, confirmation' },
    { name: 'triage', description: 'Triage alerts & prioritization' },
    { name: 'integrations', description: 'ABDM & HIS integration adapters' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'medikiosk-api' },
                    version: { type: 'string', example: '0.1.0' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/session': {
      post: {
        tags: ['auth'],
        summary: 'Create authenticated session',
        operationId: 'createSession',
        description: 'Exchange a Supabase JWT for a validated API session. Phase 2.',
        responses: {
          '501': { description: 'Not yet implemented' },
        },
      },
    },
    '/api/patients': {
      post: {
        tags: ['patients'],
        summary: 'Register a new patient',
        operationId: 'createPatient',
        description: 'Register a new patient at the kiosk. Phase 2.',
        responses: {
          '201': { description: 'Patient created' },
          '400': { description: 'Validation error' },
          '501': { description: 'Not yet implemented' },
        },
      },
    },
    '/api/patients/{id}': {
      get: {
        tags: ['patients'],
        summary: 'Get patient by ID',
        operationId: 'getPatient',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Patient record' },
          '404': { description: 'Not found' },
          '501': { description: 'Not yet implemented' },
        },
      },
    },
    '/api/history/sessions': {
      post: {
        tags: ['history'],
        summary: 'Start a clinical history session',
        operationId: 'startHistorySession',
        description: 'Initializes a clinical history interview session. Phase 3.',
        responses: {
          '201': { description: 'Session created' },
          '501': { description: 'Not yet implemented' },
        },
      },
    },
    '/api/documents': {
      post: {
        tags: ['documents'],
        summary: 'Upload a medical document',
        operationId: 'uploadDocument',
        description: 'Upload a medical document for OCR and entity extraction. Phase 4.',
        responses: {
          '201': { description: 'Document uploaded' },
          '501': { description: 'Not yet implemented' },
        },
      },
    },
    '/api/summaries/generate': {
      post: {
        tags: ['summaries'],
        summary: 'Generate clinical summary',
        operationId: 'generateSummary',
        description: 'Triggers AI summary generation for a completed patient session. Phase 5.',
        responses: {
          '202': { description: 'Summary generation started' },
          '501': { description: 'Not yet implemented' },
        },
      },
    },
    '/api/doctor/queue': {
      get: {
        tags: ['doctor'],
        summary: 'Get OPD queue',
        operationId: 'getDoctorQueue',
        description: "Today's OPD queue ordered by arrival time and risk level. Phase 6.",
        responses: {
          '200': { description: 'Queue list' },
          '403': { description: 'Insufficient permissions' },
          '501': { description: 'Not yet implemented' },
        },
      },
    },
    '/api/triage/alerts': {
      get: {
        tags: ['triage'],
        summary: 'Get active triage alerts',
        operationId: 'getTriageAlerts',
        description: 'Returns all unacknowledged triage alerts ordered by severity. Phase 6.',
        responses: {
          '200': { description: 'Alert list' },
          '403': { description: 'Insufficient permissions' },
          '501': { description: 'Not yet implemented' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase Auth JWT token',
      },
    },
  },
  security: [{ BearerAuth: [] }],
};
