'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper text-ink-primary">
      {/* ── Header ── */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-rule bg-paper shrink-0" role="banner">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center text-ink-primary" aria-hidden="true">
            <MediKioskLogo />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-[17px] font-bold text-ink-primary">MediKiosk</span>
            <span className="font-mono text-[12px] uppercase tracking-wide text-ink-tertiary">Clinical Intake</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" role="progressbar" aria-label="Step 2 of 5" aria-valuenow={2} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 2 ? 'w-8 bg-accent' : step < 2 ? 'w-2 bg-accent/40' : 'w-2 bg-paper-raised'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="font-mono text-[12px] tracking-wide text-ink-tertiary">2 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center justify-center">
        <div className="max-w-[800px] w-full flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-5 py-4 bg-signal-critical/10 border border-signal-critical text-signal-critical rounded-lg text-sm flex items-center gap-3 font-medium">
                <span className="text-lg">⚠️</span> {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full">
            <div className="text-center flex flex-col gap-3 mb-10">
              <div className="font-mono text-[12px] uppercase tracking-widest text-accent">
                {translate('PATIENT AGREEMENT', 'मरीज़ की सहमति')}
              </div>
              <h1 className="font-serif text-[42px] leading-tight text-ink-primary">
                {consentDoc?.title || translate('Consent Form', 'सहमति पत्र')}
              </h1>
              <p className="font-sans text-[16px] text-ink-secondary m-0">
                {translate('Please review and accept to proceed with your clinical intake.', 'कृपया नैदानिक जानकारी लेने के लिए समीक्षा करें और स्वीकार करें।')}
              </p>
            </div>

            <div className="bg-paper-raised border-2 border-rule shadow-card rounded-3xl p-8 flex flex-col gap-6 w-full">
              <div className="flex justify-between items-center border-b border-rule pb-4">
                <span className="font-mono text-[12px] text-ink-secondary uppercase tracking-wider">
                  {translate('Document version', 'दस्तावेज़ संस्करण')}: {consentDoc?.version || '1.0'}
                </span>
                <Button
                  onClick={toggleAudio}
                  variant="outline"
                  disabled={!consentDoc}
                  className={`h-12 px-6 font-bold rounded-xl ${
                    isAudioPlaying ? 'bg-accent/15 border-accent text-accent shadow-raised' : ''
                  }`}
                >
                  <span className="text-lg mr-2">🔊</span> {isAudioPlaying ? translate('Stop Audio', 'रोकें') : translate('Listen to Consent', 'ऑडियो सुनें')}
                </Button>
              </div>

              {/* Consent Body */}
              <div className="max-h-[250px] overflow-y-auto border-2 border-rule rounded-xl p-6 bg-paper-sunken font-sans text-[16px] leading-relaxed text-ink-primary">
                {consentDoc ? consentDoc.body : translate('Loading consent document…', 'सहमति पत्र लोड हो रहा है…')}
              </div>

              {/* Checkbox agreement */}
              <motion.div
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={() => setIsChecked(!isChecked)}
                className={`flex items-center gap-4 p-6 rounded-2xl cursor-pointer select-none transition-all border-2 ${
                  isChecked ? 'bg-accent-wash border-accent shadow-raised' : 'bg-paper-sunken border-rule hover:border-accent/50 hover:shadow-raised'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-ink-primary font-extrabold shrink-0 transition-colors ${
                    isChecked ? 'border-accent bg-accent' : 'border-rule bg-transparent'
                  }`}
                >
                  {isChecked && <span className="text-xl">✓</span>}
                </div>
                <p className={`font-sans text-[18px] m-0 font-bold ${isChecked ? 'text-accent' : 'text-ink-primary'}`}>
                  {translate('I understand and grant clinical intake consent.', 'मैं समझता/समझती हूँ और सहमति देता/देती हूँ।')}
                </p>
              </motion.div>
            </div>

            {/* Actions Row */}
            <div className="flex gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleDecline}
                disabled={isLoading}
                className="flex-1 h-16 font-bold text-lg"
              >
                {translate('Decline & Exit', 'अस्वीकार करें')}
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleGrantConsent}
                disabled={!isChecked || isLoading}
                className="flex-[2] h-16 font-bold shadow-raised text-lg"
              >
                {isLoading ? translate('Processing…', 'प्रक्रिया जारी…') : translate('Confirm & Continue →', 'सहमति दें और आगे बढ़ें →')}
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

