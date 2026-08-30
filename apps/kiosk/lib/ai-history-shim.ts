/**
 * DEV 3 shim connecting the Kiosk directly to the ai-history service.
 * Production architecture will route these through the Express proxy.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const HISTORY_URL = process.env.NEXT_PUBLIC_AI_HISTORY_DIRECT_URL || 'http://localhost:8001';

export const aiHistoryApi = {
  async getNextQuestion(payload: any) {
    const res = await fetch(`${HISTORY_URL}/dialogue/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to fetch next question");
    return res.json();
  },

  async transcribeAudio(audioBase64: string, language: string) {
    const res = await fetch(`${HISTORY_URL}/asr/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: audioBase64, language, format: 'webm' })
    });
    if (!res.ok) throw new Error("Failed to transcribe audio");
    return res.json();
  },

  async synthesizeSpeech(text: string, language: string) {
    const res = await fetch(`${HISTORY_URL}/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, speaker: 'shubh', pace: 1.0 })
    });
    if (!res.ok) throw new Error("Failed to synthesize speech");
    return res.json();
  },

  async processSection(payload: any) {
    const sessionId = payload.session_id || '00000000-0000-0000-0000-000000000002';
    const rawAnswersList = payload.answers || [];
    const formattedAnswers = rawAnswersList.map((a: any) => {
      if (typeof a === 'string') {
        return {
          question_id: 'q_1',
          question_text: 'Clinical Question',
          answer_type: 'TEXT',
          raw_answer: a,
          section_type: payload.section_type || 'CHIEF_COMPLAINT'
        };
      }
      return {
        question_id: a.question_id || 'q_1',
        question_text: a.question_text || 'Clinical Question',
        answer_type: a.answer_type || 'TEXT',
        raw_answer: a.raw_answer || (typeof a === 'object' ? JSON.stringify(a) : String(a)),
        section_type: a.section_type || payload.section_type || 'CHIEF_COMPLAINT'
      };
    });

    try {
      const res = await fetch(`${API_URL}/api/history/sessions/${sessionId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: payload.patient_id || payload.patientId || '00000000-0000-0000-0000-000000000001',
          language: payload.language || payload.lang || 'en',
          section_type: payload.section_type || 'CHIEF_COMPLAINT',
          answers: formattedAnswers
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
      const errText = await res.text().catch(() => '');
      console.error("Express API processSection failed:", res.status, errText);
    } catch (e) {
      console.warn("Express API unreachable, falling back to direct AI history processing:", e);
    }

    // Direct fallback to AI History service
    const res = await fetch(`${HISTORY_URL}/history/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        patient_id: payload.patient_id || '00000000-0000-0000-0000-000000000001',
        language: payload.language || 'en',
        section_type: payload.section_type || 'CHIEF_COMPLAINT',
        answers: formattedAnswers
      })
    });
    if (!res.ok) throw new Error("Failed to process history section");
    return res.json();
  }
};
