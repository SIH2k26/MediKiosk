import { CreatePatient, CreateConsent } from '@medikiosk/clinical-schema';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

/**
 * Standard fetch helper for calling MediKiosk API endpoints.
 */
async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || response.statusText || 'Request failed');
  }

  return result.data as T;
}

export const api = {
  // ------------------------------------------------------------------
  // Patients & identification
  // ------------------------------------------------------------------

  /**
   * Register a new patient or retrieve an existing one by phone/ABHA.
   */
  async createPatient(patientData: CreatePatient) {
    return fetchJson<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },

  /**
   * Send an OTP for optional phone verification (mock SMS in development).
   */
  async sendOtp(phone: string) {
    return fetchJson<{ sent: boolean; expiresInSeconds: number; devCode?: string }>('/patients/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  /**
   * Verify a previously sent OTP.
   */
  async verifyOtp(phone: string, code: string) {
    return fetchJson<{ verified: boolean }>('/patients/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  },

  // ------------------------------------------------------------------
  // Kiosk session lifecycle
  // ------------------------------------------------------------------

  /**
   * Start a new patient kiosk intake session (issues an OPD token).
   */
  async startSession(patientId: string, language: string, kioskId = 'KIOSK-001') {
    return fetchJson<any>('/auth/session', {
      method: 'POST',
      body: JSON.stringify({
        patientId,
        kioskId,
        language,
      }),
    });
  },

  /**
   * Mark a session COMPLETED after the patient finishes intake.
   */
  async completeSession(sessionId: string) {
    return fetchJson<any>(`/auth/session/${sessionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
  },

  /**
   * Mark a session ABANDONED (inactivity timeout / patient walked away).
   */
  async abandonSession(sessionId: string) {
    return fetchJson<any>(`/auth/session/${sessionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ABANDONED' }),
    });
  },

  /**
   * Report kiosk activity so the server can expire stale sessions.
   */
  async heartbeat(sessionId: string) {
    return fetchJson<any>(`/auth/session/${sessionId}/heartbeat`, { method: 'POST' });
  },

  // ------------------------------------------------------------------
  // Consent
  // ------------------------------------------------------------------

  /**
   * Fetch the active consent document for a language (falls back to English).
   */
  async getActiveConsentVersion(language: string) {
    return fetchJson<{ version: string; language: string; title: string; body: string; audioUrl?: string }>(
      `/consents/versions/active?language=${encodeURIComponent(language)}`
    );
  },

  /**
   * Log patient consent.
   */
  async submitConsent(consentData: CreateConsent) {
    return fetchJson<any>('/consents', {
      method: 'POST',
      body: JSON.stringify(consentData),
    });
  },

  /**
   * Record an explicit consent rejection (kept for audit purposes).
   */
  async declineConsent(consentData: CreateConsent) {
    return fetchJson<any>('/consents/decline', {
      method: 'POST',
      body: JSON.stringify(consentData),
    });
  },

  // ------------------------------------------------------------------
  // Clinical history
  // ------------------------------------------------------------------

  /**
   * Start (or resume) the clinical history for an intake session.
   */
  async startHistory(patientId: string, sessionId: string, ayushMode = false) {
    return fetchJson<any>('/history/sessions', {
      method: 'POST',
      body: JSON.stringify({ patientId, sessionId, ayushMode }),
    });
  },

  /**
   * Save a single question answer.
   */
  async submitHistoryAnswer(
    historyId: string,
    answer: {
      sectionType: string;
      questionId: string;
      questionText: string;
      answerType: 'VOICE' | 'TOUCH' | 'TEXT';
      rawAnswer: string;
      confidence?: number;
    }
  ) {
    return fetchJson<any>(`/history/sessions/${historyId}/answers`, {
      method: 'POST',
      body: JSON.stringify(answer),
    });
  },

  /**
   * Mark a history section complete.
   */
  async completeHistorySection(historyId: string, sectionType: string) {
    return fetchJson<any>(`/history/sessions/${historyId}/sections/${sectionType}/complete`, {
      method: 'POST',
    });
  },
};
