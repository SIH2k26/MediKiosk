'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import { speak, stopSpeaking } from '../../lib/i18n';

interface ConsentDoc {
  version: string;
  language: string;
  title: string;
  body: string;
  audioUrl?: string;
}

// Local fallback when the API is unreachable (kiosk resilience)
const FALLBACK_CONSENT: Record<string, ConsentDoc> = {
  en: {
    version: '1.0',
    language: 'en',
    title: 'Consent Form',
    body: 'MediKiosk collects your symptoms and digitizes your medical documents to generate a structured clinical draft history. All AI output is a draft reviewed by your physician — it is NOT an autonomous diagnosis. You may withdraw consent at any time by informing hospital staff.',
  },
  hi: {
    version: '1.0',
    language: 'hi',
    title: 'सहमति पत्र',
    body: 'मेडिकियॉस्क आपकी बीमारी के लक्षण और आपके मेडिकल दस्तावेजों को डिजिटल रूप में एकत्रित करता है। AI द्वारा बनाई गई रिपोर्ट केवल एक ड्राफ्ट है जिसे आपके डॉक्टर जांचेंगे — यह कोई अंतिम निदान नहीं है। आप किसी भी समय अपनी सहमति वापस ले सकते हैं।',
  },
};

export default function ConsentPage() {
  const router = useRouter();

  // Local state
  const [language, setLanguage] = useState('hi');
  const [patient, setPatient] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [consentDoc, setConsentDoc] = useState<ConsentDoc | null>(null);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Read session parameters from storage
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);

    try {
      const storedPatient = sessionStorage.getItem('mk_patient');
      const storedSession = sessionStorage.getItem('mk_session');

      if (storedPatient && storedSession) {
        setPatient(JSON.parse(storedPatient));
        setSession(JSON.parse(storedSession));
      } else {
        // Missing session flow — redirect to language screen
        router.push('/');
        return;
      }
    } catch {
      router.push('/');
      return;
    }

    // Load the active versioned consent document for the patient's language
    api
      .getActiveConsentVersion(lang)
      .then(setConsentDoc)
      .catch(() => setConsentDoc(FALLBACK_CONSENT[lang] || FALLBACK_CONSENT.en));

    return () => stopSpeaking();
  }, [router]);

  const translate = (en: string, hi: string) => {
    return language === 'hi' ? hi : en;
  };

  const toggleAudio = () => {
    if (isAudioPlaying) {
      stopSpeaking();
      setIsAudioPlaying(false);
    } else if (consentDoc) {
      // Audio consent explanation for low-literacy patients
      speak(`${consentDoc.title}. ${consentDoc.body}`, language);
      setIsAudioPlaying(true);
    }
  };

  const handleGrantConsent = async () => {
    if (!isChecked || !patient || !session || !consentDoc) return;
    setIsLoading(true);
    setErrorMsg(null);
    stopSpeaking();

    try {
      // Record consent in DB against the exact document version shown
      await api.submitConsent({
        patientId: patient.id,
        sessionId: session.id,
        consentVersion: consentDoc.version,
      });

      // Proceed to clinical history interview
      router.push('/history');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit consent. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    stopSpeaking();
    try {
      // Record the explicit rejection for the audit trail
      if (patient && session && consentDoc) {
        await api.declineConsent({
          patientId: patient.id,
          sessionId: session.id,
          consentVersion: consentDoc.version,
        });
        await api.abandonSession(session.id).catch(() => undefined);
      }
    } catch {
      // Non-blocking — always reset the kiosk
    }
    sessionStorage.clear();
    router.push('/');
  };

  return (
    <main className="kiosk-screen">
      {/* Header */}
      <header className="kiosk-header">
        <div className="logo">
          <div className="logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4L24 10V18L14 24L4 18V10L14 4Z" stroke="white" strokeWidth="1.5" />
              <path d="M14 11V17M11 14H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="logo-text">MediKiosk</div>
            <div className="logo-tagline">AI Clinical Intake</div>
          </div>
        </div>

        <div className="step-indicator" aria-label="Step 3 of 5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`step-dot ${step === 3 ? 'active' : step < 3 ? 'completed' : ''}`}
            />
          ))}
        </div>
      </header>

      <div className="kiosk-container" style={{ paddingTop: '100px' }}>
        {/* Error message */}
        {errorMsg && (
          <div
            className="fade-in-up"
            style={{
              background: 'rgba(217, 48, 37, 0.12)',
              border: '1px solid var(--color-emergency)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              color: '#FF8A80',
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="card fade-in-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 className="text-heading">
              {consentDoc?.title || translate('Consent Form', 'सहमति पत्र')}
            </h1>

            {/* Audio Explanation Button (for low literacy) */}
            <button
              onClick={toggleAudio}
              className="btn btn-secondary"
              disabled={!consentDoc}
              style={{
                minHeight: '48px',
                borderRadius: 'var(--radius-full)',
                padding: '0 1.25rem',
                fontSize: '0.9rem',
                borderColor: isAudioPlaying ? 'var(--color-primary)' : 'var(--color-border)',
                background: isAudioPlaying ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.04)',
              }}
            >
              🔊 {isAudioPlaying ? translate('Stop Audio', 'ऑडियो रोकें') : translate('Listen to Consent', 'सहमति पत्र सुनें')}
            </button>
          </div>

          {/* Version indicator (auditability) */}
          <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
            {translate('Document version', 'दस्तावेज़ संस्करण')}: {consentDoc?.version || '…'}
          </p>

          {/* Consent Text (versioned, fetched per language) */}
          <div
            className="text-body text-secondary"
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              background: 'rgba(0,0,0,0.2)',
              marginBottom: '2rem',
              fontSize: '1rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
            }}
          >
            {consentDoc ? consentDoc.body : translate('Loading consent document…', 'सहमति पत्र लोड हो रहा है…')}
          </div>

          {/* Agreement Checkbox */}
          <div
            onClick={() => setIsChecked(!isChecked)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              background: isChecked ? 'rgba(26,115,232,0.1)' : 'rgba(255,255,255,0.02)',
              border: `2px solid ${isChecked ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              marginBottom: '2.5rem',
              transition: 'all var(--transition-fast)',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '0.5rem',
                border: '2px solid var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isChecked ? 'var(--color-primary)' : 'transparent',
                borderColor: isChecked ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {isChecked && '✓'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {translate('I Accept the Consent terms', 'मैं सहमति पत्र स्वीकार करता हूँ')}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                {translate('Proceed to symptom questionnaire', 'लक्षणों से संबंधित सवाल शुरू करें')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="btn btn-secondary btn-xl"
              style={{ minHeight: '64px' }}
            >
              ❌ {translate('Decline & Go Back', 'अस्वीकार करें')}
            </button>

            <button
              onClick={handleGrantConsent}
              disabled={!isChecked || isLoading || !consentDoc}
              className="btn btn-primary btn-xl"
              style={{
                minHeight: '64px',
                opacity: isChecked ? 1 : 0.4,
                cursor: isChecked ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? translate('Submitting...', 'जमा हो रहा है...') : `✓ ${translate('Grant Consent & Continue', 'सहमति दें और आगे बढ़ें')}`}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
