'use client';

// =============================================================================
// OPD token screen — final step of the kiosk journey
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { makeT, speak, stopSpeaking } from '../../lib/i18n';
import { Button } from '../../components/ui/button';

const RESET_SECONDS = 20;

function MediKioskLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-dark text-ink-primary">
      {/* ── Header ── */}
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
          <div className="flex gap-1" role="progressbar" aria-label="Step 5 of 5" aria-valuenow={5} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  step === 5 ? 'w-5 bg-accent' : 'w-1.5 bg-accent/40'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-[11px] text-ink-muted font-semibold">5 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="flex-1 flex flex-col justify-center items-center max-w-[580px] w-full mx-auto px-5 py-4 box-border text-center">
        <div className="bg-dark-raised border border-dark-rule rounded-[20px] p-7 w-full shadow-2xl">
          <div className="text-4xl mb-2" aria-hidden="true">🎟️</div>
          <h1 className="font-sans text-2xl font-extrabold mb-1 tracking-tight">
            {t('Your OPD Token', 'आपका ओपीडी टोकन')}
          </h1>
          <p className="text-[13px] text-ink-secondary mb-4">
            {t('Your consultation draft has been sent to the doctor.', 'आपकी जांच रिपोर्ट डॉक्टर को भेज दी गई है।')}
          </p>

          <div className="px-5 py-3.5 bg-accent/10 border-2 border-dashed border-accent rounded-xl mb-4">
            <div className="text-[11px] font-bold text-accent uppercase tracking-[0.1em] mb-1">
              {t('TOKEN NUMBER', 'टोकन नंबर')}
            </div>
            <div className="font-sans text-[32px] font-black text-ink-primary tracking-[0.04em]">
              {opdToken || 'OPD-20260901-1042'}
            </div>
          </div>

          <p className="text-xs text-ink-muted mb-4">
            {t('Please proceed to Waiting Area 2 and wait for your token to be called.', 'कृपया प्रतीक्षालय 2 में जाएं और अपना टोकन पुकारे जाने की प्रतीक्षा करें।')}
          </p>

          <Button
            onClick={resetKiosk}
            variant="default"
            className="w-full h-11 text-sm font-bold"
          >
            {t('Done / Next Patient', 'पूर्ण / अगला मरीज')} ({secondsLeft}s)
          </Button>
        </div>
      </main>
    </div>
  );
}
