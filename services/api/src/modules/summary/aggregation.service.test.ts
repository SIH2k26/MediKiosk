import { aggregateClinicalContext } from './aggregation.service';
import { createSupabaseServiceClient } from '../../utils/supabase';

jest.mock('../../utils/supabase');

describe('aggregation.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      single: jest.fn()
    };
    mockSupabase.from = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.select = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.eq = jest.fn().mockReturnValue(mockSupabase);
    mockSupabase.in = jest.fn().mockReturnValue(mockSupabase);
    (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should aggregate context successfully with all data present', async () => {
    // Mock session
    mockSupabase.single.mockResolvedValueOnce({ data: { patient_id: 'patient-123' }, error: null });

    // Mock history_answers
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ id: 'answer-1', raw_answer: 'headache' }] });
    // Mock session documents
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ id: 'doc-1' }] });

    // Mock parallel queries (patients, meds, invs, allergies, entities, timeline, alerts)
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'patient-123', first_name: 'John' } }); // patients
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ name: 'Crocin', source_type: 'document' }] }); // meds
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ name: 'Hb', status: 'LOW' }] }); // investigations
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // allergies
    mockSupabase.in.mockResolvedValueOnce({ data: [{ entity_type: 'DIAGNOSIS', value: 'Flu' }] }); // entities
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ event_type: 'SURGERY', title: 'Appendectomy' }] }); // timeline
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ red_flags: [{ type: 'SEVERE_PAIN', severity: 'HIGH_PRIORITY' }] }] }); // alerts

    const result = await aggregateClinicalContext('session-123');

    expect(result.patientId).toBe('patient-123');
    expect(result.sessionId).toBe('session-123');
    expect(result.patient?.firstName).toBe('John');
    expect(result.historyAnswers).toHaveLength(1);
    expect(result.medications).toHaveLength(1);
    expect(result.medications[0].sourceType).toBe('document');
    expect(result.redFlags).toHaveLength(1);
    expect(result.redFlags[0].type).toBe('SEVERE_PAIN');
  });

  it('should handle missing document data gracefully', async () => {
    // Mock session
    mockSupabase.single.mockResolvedValueOnce({ data: { patient_id: 'patient-123' }, error: null });

    // Mock history_answers
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ id: 'answer-1', raw_answer: 'headache' }] });
    // Mock session documents (empty)
    mockSupabase.eq.mockResolvedValueOnce({ data: [] });

    // Mock parallel queries with empty arrays for document related data
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'patient-123' } }); // patients
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // meds
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // investigations
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // allergies
    mockSupabase.in.mockResolvedValueOnce({ data: [] }); // entities
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // timeline
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // alerts

    const result = await aggregateClinicalContext('session-123');
    expect(result.medications).toHaveLength(0);
    expect(result.investigations).toHaveLength(0);
    expect(result.extractedEntities).toHaveLength(0);
    expect(result.historyAnswers).toHaveLength(1);
  });

  it('should handle missing conversation data gracefully', async () => {
    // Mock session
    mockSupabase.single.mockResolvedValueOnce({ data: { patient_id: 'patient-123' }, error: null });

    // Mock history_answers (empty)
    mockSupabase.eq.mockResolvedValueOnce({ data: [] });
    // Mock session documents
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ id: 'doc-1' }] });

    // Mock parallel queries
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'patient-123' } }); // patients
    mockSupabase.eq.mockResolvedValueOnce({ data: [{ name: 'Crocin' }] }); // meds
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // investigations
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // allergies
    mockSupabase.in.mockResolvedValueOnce({ data: [] }); // entities
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // timeline
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // alerts

    const result = await aggregateClinicalContext('session-123');
    expect(result.historyAnswers).toHaveLength(0);
    expect(result.medications).toHaveLength(1);
  });

  it('should handle both missing data gracefully', async () => {
    // Mock session
    mockSupabase.single.mockResolvedValueOnce({ data: { patient_id: 'patient-123' }, error: null });

    // Mock history_answers (empty)
    mockSupabase.eq.mockResolvedValueOnce({ data: [] });
    // Mock session documents (empty)
    mockSupabase.eq.mockResolvedValueOnce({ data: [] });

    // Mock parallel queries
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'patient-123' } }); // patients
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // meds
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // investigations
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // allergies
    mockSupabase.in.mockResolvedValueOnce({ data: [] }); // entities
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // timeline
    mockSupabase.eq.mockResolvedValueOnce({ data: [] }); // alerts

    const result = await aggregateClinicalContext('session-123');
    expect(result.historyAnswers).toHaveLength(0);
    expect(result.medications).toHaveLength(0);
    expect(result.investigations).toHaveLength(0);
  });
});
