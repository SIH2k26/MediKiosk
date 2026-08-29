import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { createSupabaseServiceClient } from '../../utils/supabase';
import { createNotFoundError } from '../../middleware/errorHandler';
import { z } from 'zod';

export const historyRouter = Router();

const SECTION_TYPES = [
  'CHIEF_COMPLAINT',
  'HPI',
  'PAST_MEDICAL_HISTORY',
  'PAST_SURGICAL_HISTORY',
  'MEDICATIONS',
  'ALLERGIES',
  'FAMILY_HISTORY',
  'PERSONAL_HISTORY',
  'REVIEW_OF_SYSTEMS',
] as const;

const StartHistorySchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid(),
  ayushMode: z.boolean().default(false),
});

const SubmitAnswerSchema = z.object({
  sectionType: z.enum([...SECTION_TYPES, 'AYUSH']),
  questionId: z.string().min(1),
  questionText: z.string().min(1),
  answerType: z.enum(['VOICE', 'TOUCH', 'TEXT']),
  rawAnswer: z.string().min(1),
  audioUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

function mapSection(row: any) {
  return {
    id: row.id,
    historyId: row.history_id,
    sectionType: row.section_type,
    isComplete: row.is_complete,
    completedAt: row.completed_at,
  };
}

/**
 * POST /api/history/sessions
 * Start a clinical history for an intake session (idempotent per session).
 * Creates the root record plus all standard section rows.
 * Kiosk-accessible without auth.
 */
historyRouter.post('/sessions', async (req: Request, res: Response, next) => {
  try {
    const { patientId, sessionId, ayushMode } = StartHistorySchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    // Idempotency: reuse the existing history for this session
    let { data: history } = await supabase
      .from('clinical_histories')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (!history) {
      const { data: created, error: createError } = await supabase
        .from('clinical_histories')
        .insert({ patient_id: patientId, session_id: sessionId, ayush_mode: ayushMode })
        .select('*')
        .single();
      if (createError) return next(createError);
      history = created;

      const sectionTypes = ayushMode ? [...SECTION_TYPES, 'AYUSH'] : [...SECTION_TYPES];
      const { error: sectionsError } = await supabase
        .from('history_sections')
        .insert(sectionTypes.map((sectionType) => ({ history_id: history!.id, section_type: sectionType })));
      if (sectionsError) return next(sectionsError);
    }

    const { data: sections, error: fetchError } = await supabase
      .from('history_sections')
      .select('*')
      .eq('history_id', history.id);
    if (fetchError) return next(fetchError);

    res.status(201).json({
      success: true,
      data: {
        id: history.id,
        patientId: history.patient_id,
        sessionId: history.session_id,
        ayushMode: history.ayush_mode,
        completedAt: history.completed_at,
        sections: (sections || []).map(mapSection),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/history/sessions/:id/answers
 * Record a question answer within a history section.
 * Kiosk-accessible without auth.
 */
historyRouter.post('/sessions/:id/answers', async (req: Request, res: Response, next) => {
  try {
    const { id: historyId } = req.params;
    const answer = SubmitAnswerSchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    const { data: section, error: sectionError } = await supabase
      .from('history_sections')
      .select('id')
      .eq('history_id', historyId)
      .eq('section_type', answer.sectionType)
      .maybeSingle();
    if (sectionError) return next(sectionError);
    if (!section) return next(createNotFoundError('History section'));

    const { data, error } = await supabase
      .from('history_answers')
      .insert({
        section_id: section.id,
        question_id: answer.questionId,
        question_text: answer.questionText,
        answer_type: answer.answerType,
        raw_answer: answer.rawAnswer,
        audio_url: answer.audioUrl,
        confidence: answer.confidence,
      })
      .select('*')
      .single();
    if (error) return next(error);

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        sectionId: data.section_id,
        questionId: data.question_id,
        answerType: data.answer_type,
        rawAnswer: data.raw_answer,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/history/sessions/:id/sections/:sectionType/complete
 * Mark a section complete. Marks the whole history complete when all sections are done.
 */
historyRouter.post('/sessions/:id/sections/:sectionType/complete', async (req: Request, res: Response, next) => {
  try {
    const { id: historyId, sectionType } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data: section, error } = await supabase
      .from('history_sections')
      .update({ is_complete: true, completed_at: new Date().toISOString() })
      .eq('history_id', historyId)
      .eq('section_type', sectionType)
      .select('*')
      .maybeSingle();
    if (error) return next(error);
    if (!section) return next(createNotFoundError('History section'));

    // If every section is complete, close the history
    const { data: remaining } = await supabase
      .from('history_sections')
      .select('id')
      .eq('history_id', historyId)
      .eq('is_complete', false);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from('clinical_histories')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', historyId);
    }

    res.json({ success: true, data: mapSection(section) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/history/sessions/:id
 * Get a history session with all sections and answers.
 */
historyRouter.get('/sessions/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data: history, error } = await supabase
      .from('clinical_histories')
      .select('*, history_sections(*, history_answers(*))')
      .eq('id', id)
      .maybeSingle();
    if (error) return next(error);
    if (!history) return next(createNotFoundError('Clinical history'));

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/history/:patientId
 * Get complete clinical history records for a patient (staff only).
 */
historyRouter.get('/:patientId', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { patientId } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('clinical_histories')
      .select('*, history_sections(*, history_answers(*))')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) return next(error);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/history/sessions/:id/process
 * Trigger AI processing of history answers via ai-history service.
 */
historyRouter.post('/sessions/:id/process', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Process history with AI — Phase 3' },
  });
});
