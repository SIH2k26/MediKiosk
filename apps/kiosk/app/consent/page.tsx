'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import { speak, stopSpeaking } from '../../lib/i18n';
import { Button } from '../../components/ui/button';

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
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-dark text-ink-primary">
      {/* ── Compact Header ── */}
      <header
        className="h-14 px-6 flex items-center justify-between border-b border-dark-rule bg-dark shrink-0"
        role="banner"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 bg-accent rounded-md flex items-center justify-center text-dark"
            aria-hidden="true"
          >
            <MediKioskLogo />
          </div>
          <div>
            <span className="font-sans text-[15px] font-bold">MediKiosk</span>
            <span className="text-[11px] text-ink-muted ml-2">AI Clinical Intake</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1" role="progressbar" aria-label="Step 3 of 5" aria-valuenow={3} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  step === 3 ? 'w-5 bg-accent' : step < 3 ? 'w-1.5 bg-accent/40' : 'w-1.5 bg-dark-ruleStrong'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-[11px] text-ink-muted font-semibold">3 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="flex-1 flex flex-col justify-between max-w-[740px] w-full mx-auto px-5 py-4 box-border overflow-hidden">
        {/* Error message */}
        {errorMsg && (
          <div className="px-4 py-3 bg-signal-critical border border-signal-critical text-signal-critical rounded-lg text-sm flex items-center gap-2" role="alert">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Consent Card */}
        <div className="bg-dark-raised border border-dark-rule rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-sans text-xl font-bold m-0">
                {consentDoc?.title || translate('Consent Form', 'सहमति पत्र')}
              </h1>
              <p className="text-[11px] text-ink-muted mt-0.5 mb-0">
                {translate('Document version', 'दस्तावेज़ संस्करण')}: {consentDoc?.version || '1.0'}
              </p>
            </div>

            <Button
              onClick={toggleAudio}
              variant="outline"
              disabled={!consentDoc}
              className={`h-8.5 px-3 text-xs rounded-full ${
                isAudioPlaying ? 'bg-accent/15 border-accent text-accent' : ''
              }`}
            >
              🔊 {isAudioPlaying ? translate('Stop Audio', 'रोकें') : translate('Listen to Consent', 'ऑडियो सुनें')}
            </Button>
          </div>

          {/* Consent Body */}
          <div className="max-h-[160px] overflow-y-auto border border-dark-rule rounded-lg p-3 bg-black/25 text-[13px] leading-relaxed text-ink-secondary">
            {consentDoc ? consentDoc.body : translate('Loading consent document…', 'सहमति पत्र लोड हो रहा है…')}
          </div>

          {/* Checkbox agreement */}
          <div
            onClick={() => setIsChecked(!isChecked)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] cursor-pointer select-none transition-all duration-150 border-2 ${
              isChecked ? 'bg-accent/10 border-accent' : 'bg-white/5 border-dark-rule'
            }`}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center text-dark text-xs font-extrabold shrink-0 ${
                isChecked ? 'border-accent bg-accent' : 'border-white/30 bg-transparent'
              }`}
            >
              {isChecked && '✓'}
            </div>
            <p className="text-[12.5px] text-ink-primary m-0 leading-snug font-medium">
              <strong>{translate('I understand and grant clinical intake consent.', 'मैं समझता/समझती हूँ और सहमति देता/देती हूँ।')}</strong>
            </p>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex gap-2.5 mt-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDecline}
            disabled={isLoading}
            className="flex-1 h-11"
          >
            {translate('Decline & Exit', 'अस्वीकार करें')}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleGrantConsent}
            disabled={!isChecked || isLoading}
            className="flex-[2] h-11"
          >
            {isLoading ? translate('Processing…', 'प्रक्रिया जारी…') : translate('Confirm & Continue →', 'सहमति दें और आगे बढ़ें →')}
          </Button>
        </div>
      </main>
    </div>
  );
}
