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
    const sessionId = payload.session_id || 'sess_' + Date.now();
    try {
      const res = await fetch(`${API_URL}/api/history/sessions/${sessionId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: payload.patient_id || payload.patientId || '00000000-0000-0000-0000-000000000001',
          language: payload.language || payload.lang || 'en',
          section_type: payload.section_type,
          answers: payload.answers || []
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
    } catch (e) {
      console.warn("Express API unreachable, falling back to direct AI history processing:", e);
    }

    // Direct fallback to AI History service
    const res = await fetch(`${HISTORY_URL}/history/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to process history section");
    return res.json();
  }
};
