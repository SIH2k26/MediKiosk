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

function MediKioskLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ConsentPage() {
  const router = useRouter();

  const [language, setLanguage] = useState('hi');
  const [patient, setPatient] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [consentDoc, setConsentDoc] = useState<ConsentDoc | null>(null);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);

    try {
      const storedPatient = sessionStorage.getItem('mk_patient');
      const storedSession = sessionStorage.getItem('mk_session');

      if (storedPatient && storedSession) {
        setPatient(JSON.parse(storedPatient));
        setSession(JSON.parse(storedSession));
      } else {
        // Create demo session fallback
        const demoPt = { id: 'pt-' + Date.now(), firstName: 'Walk-in', lastName: 'Patient' };
        const demoSess = { id: 'sess-' + Date.now(), opdToken: 'OPD-' + Date.now().toString().slice(-4), language: lang };
        setPatient(demoPt);
        setSession(demoSess);
        sessionStorage.setItem('mk_patient', JSON.stringify(demoPt));
        sessionStorage.setItem('mk_session', JSON.stringify(demoSess));
      }
    } catch {
      // safe fallback
    }

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
      speak(`${consentDoc.title}. ${consentDoc.body}`, language);
      setIsAudioPlaying(true);
    }
  };

  const handleGrantConsent = async () => {
    if (!isChecked) return;
    setIsLoading(true);
    setErrorMsg(null);
    stopSpeaking();

    try {
      if (patient && session && consentDoc) {
        try {
          await api.submitConsent({
            patientId: patient.id,
            sessionId: session.id,
            consentVersion: consentDoc.version,
          });
        } catch (apiErr) {
          console.warn('api.submitConsent local fallback:', apiErr);
        }
      }
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
      if (patient && session && consentDoc) {
        await api.declineConsent({
          patientId: patient.id,
          sessionId: session.id,
          consentVersion: consentDoc.version,
        }).catch(() => undefined);
      }
    } catch {
      // Non-blocking
    }
    sessionStorage.clear();
    router.push('/');
  };

  return (
    <div style={{ height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--color-surface, #06090E)', color: 'var(--color-text-primary, #F0F4F8)' }}>
      {/* ── Compact Header ── */}
      <header
        style={{
          height: '56px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: 'rgba(6, 9, 14, 0.95)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
        }}
        role="banner"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: 'var(--color-primary, #00C9B1)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06090E',
            }}
            aria-hidden="true"
          >
            <MediKioskLogo />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>MediKiosk</span>
            <span style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', marginLeft: '8px' }}>AI Clinical Intake</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }} role="progressbar" aria-label="Step 3 of 5" aria-valuenow={3} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                style={{
                  width: step === 3 ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: step === 3 ? 'var(--color-primary, #00C9B1)' : step < 3 ? 'rgba(0, 201, 177, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                  transition: 'all 200ms ease',
                }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', fontWeight: 600 }}>3 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          maxWidth: '740px',
          width: '100%',
          margin: '0 auto',
          padding: '16px 20px 14px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Error message */}
        {errorMsg && (
          <div className="alert alert-error" role="alert">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Consent Card */}
        <div
          style={{
            backgroundColor: 'rgba(13, 18, 25, 0.94)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                {consentDoc?.title || translate('Consent Form', 'सहमति पत्र')}
              </h1>
              <p style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', margin: '2px 0 0 0' }}>
                {translate('Document version', 'दस्तावेज़ संस्करण')}: {consentDoc?.version || '1.0'}
              </p>
            </div>

            <button
              onClick={toggleAudio}
              className="btn btn-secondary"
              disabled={!consentDoc}
              style={{
                height: '34px',
                padding: '0 12px',
                fontSize: '12px',
                borderRadius: '9999px',
                backgroundColor: isAudioPlaying ? 'rgba(0, 201, 177, 0.15)' : 'rgba(255,255,255,0.04)',
                borderColor: isAudioPlaying ? 'var(--color-primary, #00C9B1)' : 'rgba(255,255,255,0.1)',
                color: isAudioPlaying ? 'var(--color-primary, #00C9B1)' : '#F0F4F8',
              }}
            >
              🔊 {isAudioPlaying ? translate('Stop Audio', 'रोकें') : translate('Listen to Consent', 'ऑडियो सुनें')}
            </button>
          </div>

          {/* Consent Body */}
          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px 14px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'rgba(240, 244, 248, 0.8)',
            }}
          >
            {consentDoc ? consentDoc.body : translate('Loading consent document…', 'सहमति पत्र लोड हो रहा है…')}
          </div>

          {/* Checkbox agreement */}
          <div
            onClick={() => setIsChecked(!isChecked)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              backgroundColor: isChecked ? 'rgba(0, 201, 177, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: `1.5px solid ${isChecked ? 'var(--color-primary, #00C9B1)' : 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: '10px',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 150ms ease',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: `2px solid ${isChecked ? 'var(--color-primary, #00C9B1)' : 'rgba(255,255,255,0.3)'}`,
                backgroundColor: isChecked ? 'var(--color-primary, #00C9B1)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#06090E',
                fontSize: '12px',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {isChecked && '✓'}
            </div>
            <p style={{ fontSize: '12.5px', color: '#F0F4F8', margin: 0, lineHeight: 1.4 }}>
              <strong>{translate('I understand and grant clinical intake consent.', 'मैं समझता/समझती हूँ और सहमति देता/देती हूँ।')}</strong>
            </p>
          </div>
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDecline}
            disabled={isLoading}
            style={{ flex: 1, height: '46px' }}
          >
            {translate('Decline & Exit', 'अस्वीकार करें')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGrantConsent}
            disabled={!isChecked || isLoading}
            style={{ flex: 2, height: '46px', opacity: isChecked ? 1 : 0.35, cursor: isChecked ? 'pointer' : 'not-allowed' }}
          >
            {isLoading ? translate('Processing…', 'प्रक्रिया जारी…') : translate('Confirm & Continue →', 'सहमति दें और आगे बढ़ें →')}
          </button>
        </div>
      </main>
    </div>
  );
}
