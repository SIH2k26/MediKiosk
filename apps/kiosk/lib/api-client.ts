import { supabase } from './supabase';
import { CreatePatient, CreateConsent } from '@medikiosk/clinical-schema';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

/**
 * Standard fetch helper for calling MediKiosk API endpoints.
 */
async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  
  // Attach Supabase access token (JWT) if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
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
