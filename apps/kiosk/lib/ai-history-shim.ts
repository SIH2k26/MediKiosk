/**
 * DEV 3 shim connecting the Kiosk directly to the ai-history service.
 * Production architecture will route these through the Express proxy.
 */

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
    const res = await fetch(`${HISTORY_URL}/history/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to process history section");
    return res.json();
  }
};
