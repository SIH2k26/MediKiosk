import { aggregateClinicalContext } from './aggregation.service';
import { createSupabaseServiceClient } from '../../utils/supabase';

jest.mock('../../utils/supabase');

describe('aggregation.service', () => {
  function createMockSupabase(tableData: Record<string, any>) {
    return {
      from: jest.fn((table: string) => {
        const config = tableData[table] || { data: [] };
        const queryBuilder: any = {
          select: jest.fn(() => queryBuilder),
          eq: jest.fn(() => queryBuilder),
          in: jest.fn(() => queryBuilder),
          single: jest.fn(() => Promise.resolve({ data: config.single ?? config.data?.[0] ?? null, error: config.error ?? null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: config.single ?? config.data?.[0] ?? null, error: config.error ?? null })),
          then: (resolve: (val: any) => void) => resolve({ data: config.data ?? [], error: config.error ?? null }),
        };
        return queryBuilder;
      }),
    };
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should aggregate context successfully with all data present', async () => {
    const mockSupabase = createMockSupabase({
      patient_sessions: { single: { patient_id: 'patient-123' } },
      history_answers: { data: [{ id: 'answer-1', raw_answer: 'headache', question_id: 'cc_1' }] },
      documents: { data: [{ id: 'doc-1' }] },
      patients: { single: { id: 'patient-123', first_name: 'John', last_name: 'Doe' } },
      medications: { data: [{ id: 'med-1', name: 'Crocin', source_type: 'document' }] },
      investigations: { data: [{ id: 'inv-1', name: 'Hb', status: 'LOW' }] },
      allergies: { data: [] },
      extracted_entities: { data: [{ id: 'ent-1', entity_type: 'DIAGNOSIS', value: 'Flu' }] },
      timeline_events: { data: [{ id: 'tl-1', event_type: 'SURGERY', title: 'Appendectomy' }] },
      triage_alerts: { data: [{ id: 'al-1', red_flags: [{ type: 'SEVERE_PAIN', severity: 'HIGH_PRIORITY' }] }] },
    });

    (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);

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
    const mockSupabase = createMockSupabase({
      patient_sessions: { single: { patient_id: 'patient-123' } },
      history_answers: { data: [{ id: 'answer-1', raw_answer: 'headache' }] },
      documents: { data: [] },
      patients: { single: { id: 'patient-123' } },
      medications: { data: [] },
      investigations: { data: [] },
      allergies: { data: [] },
      extracted_entities: { data: [] },
      timeline_events: { data: [] },
      triage_alerts: { data: [] },
    });

    (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    const result = await aggregateClinicalContext('session-123');
    expect(result.medications).toHaveLength(0);
    expect(result.investigations).toHaveLength(0);
    expect(result.extractedEntities).toHaveLength(0);
    expect(result.historyAnswers).toHaveLength(1);
  });

  it('should handle missing conversation data gracefully', async () => {
    const mockSupabase = createMockSupabase({
      patient_sessions: { single: { patient_id: 'patient-123' } },
      history_answers: { data: [] },
      documents: { data: [{ id: 'doc-1' }] },
      patients: { single: { id: 'patient-123' } },
      medications: { data: [{ name: 'Crocin' }] },
      investigations: { data: [] },
      allergies: { data: [] },
      extracted_entities: { data: [] },
      timeline_events: { data: [] },
      triage_alerts: { data: [] },
    });

    (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    const result = await aggregateClinicalContext('session-123');
    expect(result.historyAnswers).toHaveLength(0);
    expect(result.medications).toHaveLength(1);
  });

  it('should handle both missing data gracefully', async () => {
    const mockSupabase = createMockSupabase({
      patient_sessions: { single: { patient_id: 'patient-123' } },
      history_answers: { data: [] },
      documents: { data: [] },
      patients: { single: { id: 'patient-123' } },
      medications: { data: [] },
      investigations: { data: [] },
      allergies: { data: [] },
      extracted_entities: { data: [] },
      timeline_events: { data: [] },
      triage_alerts: { data: [] },
    });

    (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    const result = await aggregateClinicalContext('session-123');
    expect(result.historyAnswers).toHaveLength(0);
    expect(result.medications).toHaveLength(0);
    expect(result.investigations).toHaveLength(0);
  });
});
