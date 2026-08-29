import { createSupabaseServiceClient } from '../../utils/supabase';
import { 
  AggregatedClinicalContext, 
  HistoryAnswer, 
  Medication, 
  Investigation, 
  Allergy, 
  ExtractedEntity, 
  TimelineEvent, 
  TriageAlert,
  RedFlag,
  Patient
} from '@medikiosk/shared-types';

/**
 * Aggregates all clinical context for a specific session to be used for summary generation.
 * This includes conversational history answers, extracted document entities, and timeline events.
 * Handles missing data gracefully.
 */
export async function aggregateClinicalContext(sessionId: string): Promise<AggregatedClinicalContext> {
  const supabase = createSupabaseServiceClient();

  // Fetch session details to get the patientId
  const { data: sessionData, error: sessionError } = await supabase
    .from('patient_sessions')
    .select('patient_id')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    throw new Error(`Failed to fetch session: ${sessionError.message}`);
  }

  const patientId = sessionData.patient_id;

  // We need to fetch history_answers. History answers belong to a section.
  // We can fetch via clinical_histories -> history_sections -> history_answers
  // Or directly history_answers if we join with history_sections.
  const { data: historyAnswersData } = await supabase
    .from('history_answers')
    .select('*, history_sections!inner(clinical_histories!inner(session_id))')
    .eq('history_sections.clinical_histories.session_id', sessionId);
  
  const historyAnswers = historyAnswersData || [];

  // Documents linked to this session
  const { data: sessionDocumentsData } = await supabase
    .from('documents')
    .select('id')
    .eq('session_id', sessionId);
    
  const sessionDocumentIds = (sessionDocumentsData || []).map(d => d.id);

  // Run all other queries in parallel for efficiency.
  // We fetch medications, investigations, allergies, entities and timeline events
  // that belong to this patient (which gives historical context) or just this session?
  // The requirements say "scoped to that session". Wait, usually history is patient-wide.
  // But let's fetch for the patient and let the LLM see all of it, or limit to the session?
  // Prompt says: "queries Supabase for ... scoped to that session". 
  // Let's scope to session if possible. For documents, we scope by document_id in session.
  // For medications, investigations, etc., we can scope by patient_id since health records are for the patient.

  const [
    { data: patient },
    { data: medications },
    { data: investigations },
    { data: allergies },
    { data: extractedEntities },
    { data: timelineEvents },
    { data: triageAlerts }
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', patientId).single(),
    supabase.from('medications').select('*').eq('patient_id', patientId),
    supabase.from('investigations').select('*').eq('patient_id', patientId),
    supabase.from('allergies').select('*').eq('patient_id', patientId),
    supabase.from('extracted_entities').select('*').in('document_id', sessionDocumentIds.length > 0 ? sessionDocumentIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('timeline_events').select('*').eq('patient_id', patientId),
    supabase.from('triage_alerts').select('*').eq('session_id', sessionId)
  ]);

  // Extract red flags from triage alerts if present
  let redFlags: RedFlag[] = [];
  if (triageAlerts && triageAlerts.length > 0) {
    redFlags = triageAlerts.flatMap((alert: any) => alert.red_flags || []);
  }

  return {
    patientId,
    sessionId,
    patient: patient ? (camelcaseKeys(patient) as Patient) : undefined,
    historyAnswers: historyAnswers.map(camelcaseKeys) as HistoryAnswer[],
    medications: (medications || []).map(camelcaseKeys) as Medication[],
    investigations: (investigations || []).map(camelcaseKeys) as Investigation[],
    allergies: (allergies || []).map(camelcaseKeys) as Allergy[],
    extractedEntities: (extractedEntities || []).map(camelcaseKeys) as ExtractedEntity[],
    timelineEvents: (timelineEvents || []).map(camelcaseKeys) as TimelineEvent[],
    triageAlerts: (triageAlerts || []).map(camelcaseKeys) as TriageAlert[],
    redFlags
  };
}

// Helper to convert snake_case DB columns to camelCase TS properties
function camelcaseKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(camelcaseKeys);
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      // Remove joined tables from Supabase output like 'history_sections'
      if (key === 'history_sections') return acc;
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = camelcaseKeys(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}
