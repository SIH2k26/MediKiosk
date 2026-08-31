import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { createSupabaseServiceClient } from '../../utils/supabase';
import { HttpError, createNotFoundError } from '../../middleware/errorHandler';
import { z } from 'zod';

export const documentsRouter = Router();

const AI_DOCUMENTS_URL = process.env.AI_DOCUMENTS_URL ?? 'http://localhost:8001';

const CreateDocumentSchema = z.object({
  patientId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  type: z.enum(['PRESCRIPTION', 'LAB_REPORT', 'DISCHARGE_SUMMARY', 'IMAGING_REPORT', 'PROCEDURE_RECORD', 'OTHER']),
  originalFileName: z.string().min(1),
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive().optional(),
  language: z.string().default('hi'),
  autoProcess: z.boolean().default(true),
});

/**
 * POST /api/documents
 * Register an uploaded medical document (kiosk or portal).
 */
documentsRouter.post('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = CreateDocumentSchema.parse(req.body);
    const supabase = createSupabaseServiceClient();

    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        patient_id: payload.patientId,
        session_id: payload.sessionId,
        type: payload.type,
        status: 'UPLOADED',
        storage_path: payload.storagePath,
        original_filename: payload.originalFileName,
        mime_type: payload.mimeType,
        file_size_bytes: payload.fileSizeBytes || 0,
      })
      .select('*')
      .single();

    if (docError) return next(docError);

    // If autoProcess is true, trigger background AI processing
    if (payload.autoProcess) {
      triggerDocumentProcessing(document.id, payload.storagePath, payload.mimeType, payload.language, payload.patientId).catch((err) => {
        console.error(`[DocumentsRouter] Background processing failed for ${document.id}:`, err);
      });
    }

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id
 * Get document metadata and extracted entities.
 */
documentsRouter.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(`
        *,
        document_pages (*),
        extracted_entities (*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (docError) return next(docError);
    if (!document) return next(createNotFoundError('Document'));

    res.json({
      success: true,
      data: document,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/:id/process
 * Manually trigger or re-run AI processing (OCR + entity extraction).
 */
documentsRouter.post('/:id/process', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const language = (req.body.language as string) || 'hi';
    const supabase = createSupabaseServiceClient();

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (docError) return next(docError);
    if (!document) return next(createNotFoundError('Document'));

    const result = await triggerDocumentProcessing(
      document.id,
      document.storage_path,
      document.mime_type,
      language,
      document.patient_id
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id/download
 * Get a signed URL to download a document from Supabase Storage.
 */
documentsRouter.get('/:id/download', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const supabase = createSupabaseServiceClient();

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();

    if (docError) return next(docError);
    if (!document) return next(createNotFoundError('Document'));

    // Create 15-minute signed URL
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.storage_path, 900);

    if (signError) {
      // Fallback: construct public URL or mock URL for dev
      return res.json({
        success: true,
        data: {
          signedUrl: `/api/mock-storage/documents/${document.storage_path}`,
          expiresIn: 900,
        },
      });
    }

    res.json({
      success: true,
      data: {
        signedUrl: signedUrlData.signedUrl,
        expiresIn: 900,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper: forwards document to ai-documents service and stores extracted data.
 */
async function triggerDocumentProcessing(
  documentId: string,
  storagePath: string,
  mimeType: string,
  language: string,
  patientId: string
) {
  const supabase = createSupabaseServiceClient();

  // 1. Update status to PROCESSING
  await supabase
    .from('documents')
    .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
    .eq('id', documentId);

  try {
    // 2. Call ai-documents FastAPI endpoint
    const response = await fetch(`${AI_DOCUMENTS_URL}/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
        storage_url: storagePath,
        mime_type: mimeType,
        language: language,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`AI Documents service returned ${response.status}: ${errText}`);
    }

    const aiResult = await response.json();

    // 3. Save extracted pages
    if (aiResult.ocr_text) {
      await supabase.from('document_pages').insert({
        document_id: documentId,
        page_number: 1,
        raw_text: aiResult.ocr_text,
        confidence_score: aiResult.confidence ?? 0.9,
      });
    }

    // 4. Save extracted medications
    if (Array.isArray(aiResult.medications) && aiResult.medications.length > 0) {
      const medsToInsert = aiResult.medications.map((m: any) => ({
        patient_id: patientId,
        name: m.name,
        generic_name: m.generic_name,
        dose: m.dose,
        frequency: m.frequency,
        route: m.route,
        is_currently_taking: m.is_currently_taking ?? true,
        source_document_id: documentId,
        page_number: m.page_number || 1,
        source_type: 'document',
      }));
      await supabase.from('medications').insert(medsToInsert);
    }

    // 5. Save extracted investigations / lab results
    if (Array.isArray(aiResult.investigations) && aiResult.investigations.length > 0) {
      const invsToInsert = aiResult.investigations.map((inv: any) => ({
        patient_id: patientId,
        name: inv.name,
        value: typeof inv.value === 'number' ? inv.value.toString() : inv.value,
        unit: inv.unit,
        status: inv.status || 'NORMAL',
        is_abnormal: inv.is_abnormal || (inv.status === 'LOW' || inv.status === 'HIGH' || inv.status === 'CRITICAL'),
        source_document_id: documentId,
        page_number: inv.page_number || 1,
        source_type: 'document',
        extracted_by_ai: true,
      }));
      await supabase.from('investigations').insert(invsToInsert);
    }

    // 6. Save extracted allergies
    if (Array.isArray(aiResult.allergies) && aiResult.allergies.length > 0) {
      const allergiesToInsert = aiResult.allergies.map((a: any) => ({
        patient_id: patientId,
        substance: a.substance,
        type: a.type || 'DRUG',
        reaction: a.reaction,
        severity: a.severity || 'MILD',
        source_document_id: documentId,
        page_number: a.page_number || 1,
        source_type: 'document',
      }));
      await supabase.from('allergies').insert(allergiesToInsert);
    }

    // 7. Update document status to PROCESSED
    await supabase
      .from('documents')
      .update({
        status: 'PROCESSED',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    return aiResult;
  } catch (err: any) {
    console.error(`[triggerDocumentProcessing] Error processing document ${documentId}:`, err);
    await supabase
      .from('documents')
      .update({ status: 'FAILED', updated_at: new Date().toISOString() })
      .eq('id', documentId);
    throw err;
  }
}
