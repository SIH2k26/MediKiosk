'use client';

// =============================================================================
// OPD token screen — final step of the kiosk journey
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { makeT, speak, stopSpeaking } from '../../lib/i18n';
import { Button } from '../../components/ui/button';

const RESET_SECONDS = 20;

function MediKioskLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function TokenPage() {
  const router = useRouter();
  const [language, setLanguage] = useState('hi');
  const [opdToken, setOpdToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESET_SECONDS);

  const t = makeT(language);

  const resetKiosk = useCallback(() => {
    stopSpeaking();
    sessionStorage.clear();
    router.replace('/');
  }, [router]);

  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);

    try {
      const session = JSON.parse(sessionStorage.getItem('mk_session') || 'null');
      const token = session?.opdToken || 'OPD-20260901-' + Math.floor(1000 + Math.random() * 9000);
      setOpdToken(token);

      const tokenDigits = String(token).split('-').pop();
      speak(
        lang === 'hi'
          ? `आपका ओपीडी टोकन नंबर ${tokenDigits} है। कृपया अपनी बारी की प्रतीक्षा करें।`
          : `Your OPD token number is ${tokenDigits}. Please wait for your turn.`,
        lang
      );
    } catch {
      router.replace('/');
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          resetKiosk();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      stopSpeaking();
    };
  }, [router, resetKiosk]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
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
          <div className="flex gap-1.5" role="progressbar" aria-label="Step 5 of 5" aria-valuenow={5} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 w-8 bg-accent`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="font-mono text-[12px] tracking-wide text-ink-tertiary">5 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="flex-1 flex flex-col items-center pt-12 pb-24 overflow-y-auto w-full px-6 py-10 box-border text-center overflow-y-auto">
        <AnimatePresence>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full max-w-[800px] flex flex-col items-center">
            
            <motion.div variants={containerVariants} className="text-center flex flex-col gap-3 mb-10">
              <div className="font-mono text-[12px] uppercase tracking-widest text-accent">
                {t('ALL DONE', 'पूर्ण हुआ')}
              </div>
              <h1 className="font-serif text-[48px] leading-tight text-ink-primary">
                {t('Your OPD Token', 'आपका ओपीडी टोकन')}
              </h1>
              <p className="font-sans text-[18px] text-ink-secondary m-0 max-w-[500px] mx-auto">
                {t('Your consultation draft has been sent to the doctor.', 'आपकी जांच रिपोर्ट डॉक्टर को भेज दी गई है।')}
              </p>
            </motion.div>

            <motion.div variants={containerVariants} className="w-full max-w-[600px] bg-paper-raised border-2 border-accent rounded-3xl p-10 flex flex-col items-center justify-center shadow-card shadow-accent/10">
              <div className="text-[12px] font-bold text-accent uppercase tracking-widest mb-4">
                {t('TOKEN NUMBER', 'टोकन नंबर')}
              </div>
              <div className="font-serif text-[64px] font-bold text-ink-primary tracking-wider leading-none mb-6">
                {opdToken || 'OPD-2026-1042'}
              </div>
              <p className="font-sans text-[16px] text-ink-secondary m-0 text-center max-w-[400px]">
                {t('Please proceed to Waiting Area 2 and wait for your token to be called.', 'कृपया प्रतीक्षालय 2 में जाएं और अपना टोकन पुकारे जाने की प्रतीक्षा करें।')}
              </p>
            </motion.div>

            <motion.div variants={containerVariants} className="mt-12 w-full max-w-[600px]">
              <Button
                onClick={resetKiosk}
                variant="default"
                className="w-full h-16 font-bold text-xl shadow-raised"
              >
                {t('Done / Next Patient', 'पूर्ण / अगला मरीज')} ({secondsLeft}s)
              </Button>
            </motion.div>

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

