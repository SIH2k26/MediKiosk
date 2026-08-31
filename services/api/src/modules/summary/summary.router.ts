import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, requireRole } from '../../middleware/auth';
import { aggregateClinicalContext } from './aggregation.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RedFlagSchema } from '@medikiosk/clinical-schema';
import { validateSummaryStructure, enforceRedFlagConsistency, checkHallucinations } from './guardrails';
import { createSupabaseServiceClient } from '../../utils/supabase';
import { createNotFoundError } from '../../middleware/errorHandler';
import { z } from 'zod';

export const summaryRouter = Router();

// Zod schema for what the LLM should output
const LlmSummaryOutputSchema = z.object({
  chiefComplaintSummary: z.string(),
  hpiNarrative: z.string(),
  pastHistorySummary: z.string(),
  medicationSummary: z.string(),
  allergySummary: z.string(),
  investigationSummary: z.string(),
  timelineSummary: z.string(),
  systemsReview: z.string(),
  riskLevel: z.enum(['NORMAL', 'WARNING', 'HIGH_PRIORITY', 'EMERGENCY']),
  redFlags: z.array(RedFlagSchema),
  mentionedMedications: z.array(z.string()),
  mentionedInvestigations: z.array(z.string()),
  mentionedAllergies: z.array(z.string()),
});

type LlmSummaryOutput = z.infer<typeof LlmSummaryOutputSchema>;

/**
 * Fallback generator when Gemini API is unavailable or offline
 */
function buildRuleBasedSummary(context: any): LlmSummaryOutput {
  const ccAnswers = context.historyAnswers.filter((a: any) =>
    a.questionId.includes('cc') || a.questionId.includes('complaint') || a.questionId === 'q_chief_complaint'
  );
  const chiefComplaint = ccAnswers.map((a: any) => a.rawAnswer).join(', ') || 'Patient intake completed';

  const medList = context.medications.map((m: any) => `${m.name} ${m.dose || ''} ${m.frequency || ''}`.trim()).join(', ') || 'No active medications recorded';
  const allergyList = context.allergies.map((a: any) => a.substance).join(', ') || 'No known drug allergies (NKDA)';
  const invList = context.investigations.map((i: any) => `${i.name}: ${i.value} ${i.unit || ''} (${i.status || 'NORMAL'})`).join(', ') || 'No lab reports recorded';

  const highestRisk = context.triageAlerts && context.triageAlerts.length > 0
    ? context.triageAlerts[0].riskLevel
    : 'NORMAL';

  return {
    chiefComplaintSummary: chiefComplaint,
    hpiNarrative: `Patient presented with ${chiefComplaint}. Symptoms recorded during intake questionnaire.`,
    pastHistorySummary: 'Past medical and surgical history reviewed during intake.',
    medicationSummary: medList,
    allergySummary: allergyList,
    investigationSummary: invList,
    timelineSummary: 'Clinical intake timeline synthesized from provided records and responses.',
    systemsReview: 'Review of systems captured via clinical questionnaire.',
    riskLevel: highestRisk,
    redFlags: context.redFlags || [],
    mentionedMedications: context.medications.map((m: any) => m.name),
    mentionedInvestigations: context.investigations.map((i: any) => i.name),
    mentionedAllergies: context.allergies.map((a: any) => a.substance),
  };
}

/**
 * POST /api/summaries/generate/:sessionId
 * Generate a clinical summary for a patient session.
 */
summaryRouter.post('/generate/:sessionId', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  try {
    // 1. Aggregation
    const context = await aggregateClinicalContext(sessionId);
    const geminiKey = process.env.GEMINI_API_KEY;

    let parsedData: LlmSummaryOutput | null = null;
    let lastError = '';

    if (geminiKey && geminiKey !== 'your_gemini_api_key' && !geminiKey.startsWith('mock_')) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      let attempt = 0;
      const maxAttempts = 3;

      const basePrompt = `
You are an expert physician assistant. Write a concise, professional clinical summary.
Use this aggregated context:
${JSON.stringify(context, null, 2)}

Return a JSON object strictly matching this schema:
{
  "chiefComplaintSummary": "string",
  "hpiNarrative": "string",
  "pastHistorySummary": "string",
  "medicationSummary": "string",
  "allergySummary": "string",
  "investigationSummary": "string",
  "timelineSummary": "string",
  "systemsReview": "string",
  "riskLevel": "NORMAL | WARNING | HIGH_PRIORITY | EMERGENCY",
  "redFlags": [{"type": "str", "description": "str", "severity": "...", "triggeredBy": [], "requiresImmediateAttention": true}],
  "mentionedMedications": ["drug1"],
  "mentionedInvestigations": ["lab1"],
  "mentionedAllergies": ["allergy1"]
}
`;

      while (attempt < maxAttempts) {
        attempt++;
        let prompt = basePrompt;
        if (lastError) {
          prompt += `\n\nYour previous attempt failed validation. Please fix the following errors:\n${lastError}`;
        }

        try {
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const jsonOutput = JSON.parse(text);

          const validation = validateSummaryStructure(LlmSummaryOutputSchema, jsonOutput);
          if (validation.success) {
            parsedData = validation.data;
            break;
          } else {
            lastError = validation.errors;
          }
        } catch (err: any) {
          lastError = `JSON Parse Error: ${err.message}`;
        }
      }
    }

    // Fallback if LLM key is absent or generation failed
    if (!parsedData) {
      console.log('[SummaryRouter] Utilizing structured fallback clinical summary generator.');
      parsedData = buildRuleBasedSummary(context);
    }

    const supabase = createSupabaseServiceClient();

    // 4. Guardrails: Red Flag Consistency
    const { finalRedFlags, finalRiskLevel, mismatches } = enforceRedFlagConsistency(
      parsedData.redFlags,
      context.redFlags,
      parsedData.riskLevel,
      context.triageAlerts && context.triageAlerts.length > 0
        ? context.triageAlerts[0].riskLevel
        : 'NORMAL'
    );

    // 5. Guardrails: Hallucination Check
    const hallucinations = checkHallucinations(
      parsedData.mentionedMedications,
      parsedData.mentionedInvestigations,
      parsedData.mentionedAllergies,
      context
    );

    // 6. Traceability mapping (summary_sources)
    const summarySources = {
      medications: (context.medications || []).map((m: any) => ({ id: m.id, source_document_id: m.sourceDocumentId, page_number: m.pageNumber, answer_id: m.answerId })),
      investigations: (context.investigations || []).map((i: any) => ({ id: i.id, source_document_id: i.sourceDocumentId, page_number: i.pageNumber, answer_id: i.answerId })),
      allergies: (context.allergies || []).map((a: any) => ({ id: a.substance, source_document_id: a.sourceDocumentId, page_number: a.pageNumber, answer_id: a.answerId })),
      history_answers: (context.historyAnswers || []).map((h: any) => ({ id: h.id, question_id: h.questionId })),
      guardrail_mismatches: mismatches,
      guardrail_hallucinations: hallucinations,
    };

    // 7. Insert to DB
    const insertData = {
      patient_id: context.patientId,
      session_id: context.sessionId,
      status: 'draft_ai',
      risk_level: finalRiskLevel,
      red_flags: finalRedFlags,
      chief_complaint_summary: parsedData.chiefComplaintSummary,
      hpi_narrative: parsedData.hpiNarrative,
      past_history_summary: parsedData.pastHistorySummary,
      medication_summary: parsedData.medicationSummary,
      allergy_summary: parsedData.allergySummary,
      investigation_summary: parsedData.investigationSummary,
      timeline_summary: parsedData.timelineSummary,
      systems_review: parsedData.systemsReview,
      summary_sources: summarySources,
    };

    const { data: insertedSummary, error: insertError } = await supabase
      .from('clinical_summaries')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(200).json({
      success: true,
      data: {
        summaryId: insertedSummary.id,
        status: insertedSummary.status,
        summary: insertedSummary,
        hallucinationsFlagged: hallucinations.length > 0,
        mismatchesFlagged: mismatches.length > 0,
      },
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'GENERATION_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/summaries/:patientId
 * Get clinical summaries for a patient.
 */
summaryRouter.get('/:patientId', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('clinical_summaries')
      .select('*, doctor_reviews(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) return next(error);

    res.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/summaries/:id
 * Doctor updates summary fields.
 */
summaryRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['DOCTOR']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const supabase = createSupabaseServiceClient();

      const { data: updated, error } = await supabase
        .from('clinical_summaries')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) return next(error);
      if (!updated) return next(createNotFoundError('Clinical summary'));

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);
