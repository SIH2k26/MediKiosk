import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { aggregateClinicalContext } from './aggregation.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateSummarySchema, RedFlagSchema } from '@medikiosk/clinical-schema';
import { validateSummaryStructure, enforceRedFlagConsistency, checkHallucinations } from './guardrails';
import { createSupabaseServiceClient } from '../../utils/supabase';
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
 * POST /api/summaries/generate/:sessionId
 * Generate a clinical summary for a patient session.
 */
summaryRouter.post('/generate/:sessionId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;

  try {
    // 1. Aggregation
    const context = await aggregateClinicalContext(sessionId);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    let attempt = 0;
    const maxAttempts = 3;
    let lastError = '';
    let parsedData: LlmSummaryOutput | null = null;

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

    // 2. LLM Generation with Retries
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
          break; // Success
        } else {
          lastError = validation.errors;
        }
      } catch (err: any) {
        lastError = `JSON Parse Error: ${err.message}`;
      }
    }

    const supabase = createSupabaseServiceClient();

    // 3. Handle Validation Failure
    if (!parsedData) {
      // Write failure status
      await supabase.from('clinical_summaries').insert({
        patient_id: context.patientId,
        session_id: context.sessionId,
        status: 'validation_failed',
        chief_complaint_summary: '',
        hpi_narrative: '',
        past_history_summary: '',
        medication_summary: '',
        allergy_summary: '',
        investigation_summary: '',
        timeline_summary: '',
        risk_level: 'NORMAL',
        red_flags: [],
        summary_sources: { error: 'Failed structural validation after 3 attempts', details: lastError }
      });

      res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Failed to generate a valid summary.', details: lastError },
      });
      return;
    }

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
      medications: context.medications.map((m: any) => ({ id: m.id, source_document_id: m.sourceDocumentId, page_number: m.pageNumber, answer_id: m.answerId })),
      investigations: context.investigations.map((i: any) => ({ id: i.id, source_document_id: i.sourceDocumentId, page_number: i.pageNumber, answer_id: i.answerId })),
      allergies: context.allergies.map((a: any) => ({ id: a.substance, source_document_id: a.sourceDocumentId, page_number: a.pageNumber, answer_id: a.answerId })),
      history_answers: context.historyAnswers.map((h: any) => ({ id: h.id, question_id: h.questionId })),
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

    // Assuming we insert a new summary or update if one exists.
    // Let's just insert
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
        hallucinationsFlagged: hallucinations.length > 0,
        mismatchesFlagged: mismatches.length > 0
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'GENERATION_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/summaries/:patientId
 * Get clinical summaries for a patient.
 */
summaryRouter.get('/:patientId', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Get summaries — Phase 5' },
  });
});

/**
 * PATCH /api/summaries/:id
 * Doctor updates/confirms a summary.
 */
summaryRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['DOCTOR']),
  async (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Update summary — Phase 5' },
    });
  }
);
