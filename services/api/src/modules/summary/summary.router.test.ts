import { summaryRouter } from './summary.router';
import express from 'express';
import request from 'supertest';
import { aggregateClinicalContext } from './aggregation.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseServiceClient } from '../../utils/supabase';

// Mock dependencies
jest.mock('./aggregation.service');
jest.mock('@google/generative-ai');
jest.mock('../../utils/supabase');
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
  optionalAuth: (req: any, res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/summaries', summaryRouter);

describe('POST /api/summaries/generate/:sessionId', () => {
  let mockSupabase: any;
  let mockGenerativeModel: any;

  beforeEach(() => {
    mockSupabase = {
      single: jest.fn(),
    };
    mockSupabase.from = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.insert = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.select = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.eq = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.order = jest.fn().mockReturnValue(mockSupabase);
    (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    mockGenerativeModel = {
      generateContent: jest.fn(),
    };
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: () => mockGenerativeModel,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a summary successfully and write to the database', async () => {
    // Mock the context
    (aggregateClinicalContext as jest.Mock).mockResolvedValue({
      patientId: 'patient-123',
      sessionId: 'session-123',
      historyAnswers: [],
      medications: [{ id: 'med-1', name: 'Aspirin', sourceDocumentId: 'doc-1' }],
      investigations: [],
      allergies: [],
      extractedEntities: [],
      timelineEvents: [],
      triageAlerts: [],
      redFlags: [],
    });

    // Mock Gemini LLM output
    const mockLlmOutput = {
      chiefComplaintSummary: 'Headache',
      hpiNarrative: 'Patient has had a headache for 2 days.',
      pastHistorySummary: 'None',
      medicationSummary: 'Aspirin',
      allergySummary: 'None',
      investigationSummary: 'None',
      timelineSummary: 'None',
      systemsReview: 'Normal',
      riskLevel: 'NORMAL',
      redFlags: [],
      mentionedMedications: ['Aspirin'],
      mentionedInvestigations: [],
      mentionedAllergies: [],
    };

    mockGenerativeModel.generateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockLlmOutput),
      },
    });

    // Mock DB insert success
    mockSupabase.single.mockResolvedValue({
      data: {
        id: 'summary-123',
        status: 'draft_ai',
      },
      error: null,
    });

    const response = await request(app).post('/api/summaries/generate/session-123');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summaryId).toBe('summary-123');
    expect(response.body.data.status).toBe('draft_ai');

    // Assert insertion data has traceability
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: 'patient-123',
        session_id: 'session-123',
        status: 'draft_ai',
        summary_sources: expect.objectContaining({
          medications: expect.arrayContaining([
            expect.objectContaining({ id: 'med-1', source_document_id: 'doc-1' })
          ])
        })
      })
    );
  });
});
