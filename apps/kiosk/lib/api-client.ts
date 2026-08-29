// @ts-ignore - Temporary bypass for missing workspace linking in DEV environment
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
   * Start a new patient kiosk intake session.
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
   * Log patient consent.
   */
  async submitConsent(consentData: CreateConsent) {
    return fetchJson<any>('/consents', {
      method: 'POST',
      body: JSON.stringify(consentData),
    });
  },
};
