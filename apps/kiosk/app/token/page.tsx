'use client';

// =============================================================================
// OPD token screen — final step of the kiosk journey
// =============================================================================
// Shows the patient's OPD queue token, then automatically resets the kiosk
// for the next patient after a short countdown.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { makeT, speak, stopSpeaking } from '../../lib/i18n';

const RESET_SECONDS = 20;

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
      if (!session) {
        router.replace('/');
        return;
      }
      setOpdToken(session.opdToken || null);

      // Announce the token aloud for low-literacy patients
      if (session.opdToken) {
        const tokenDigits = String(session.opdToken).split('-').pop();
        speak(
          lang === 'hi'
            ? `आपका ओपीडी टोकन नंबर ${tokenDigits} है। कृपया अपनी बारी की प्रतीक्षा करें।`
            : `Your OPD token number is ${tokenDigits}. Please wait for your turn.`,
          lang
        );
      }
    } catch {
      router.replace('/');
      return;
    }

    // Auto-reset countdown so the kiosk is ready for the next patient
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
    <main className="kiosk-screen">
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

        <div className="step-indicator" aria-label="Step 5 of 5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className={`step-dot ${step === 5 ? 'active' : 'completed'}`} />
          ))}
        </div>
      </header>

      <div className="kiosk-container" style={{ paddingTop: '120px', textAlign: 'center', maxWidth: '640px' }}>
        <div className="fade-in-up" style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }} aria-hidden="true">🎟️</div>
          <h1 className="text-display" style={{ marginBottom: '0.75rem' }}>
            {t('Your OPD Token', 'आपका ओपीडी टोकन')}
          </h1>
          <p className="text-body text-secondary">
            {t(
              'Please remember your token and wait for your turn.',
              'कृपया अपना टोकन याद रखें और अपनी बारी की प्रतीक्षा करें।'
            )}
          </p>
        </div>

        {/* Token display */}
        <div
          className="card fade-in-up fade-in-up-delay-1"
          style={{
            padding: '2.5rem',
            marginBottom: '2rem',
            border: '2px solid var(--color-primary)',
          }}
        >
          <div
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: 'var(--color-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
            aria-label={`OPD token ${opdToken || ''}`}
          >
            {opdToken || t('Token unavailable', 'टोकन उपलब्ध नहीं')}
          </div>
        </div>

        <div className="fade-in-up fade-in-up-delay-2">
          <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            {t(
              `This kiosk will reset in ${secondsLeft} seconds for the next patient.`,
              `यह कियोस्क अगले मरीज के लिए ${secondsLeft} सेकंड में रीसेट हो जाएगा।`
            )}
          </p>
          <button className="btn btn-primary btn-xl" style={{ minHeight: '64px' }} onClick={resetKiosk}>
            ✓ {t('Done — Reset Kiosk', 'समाप्त — कियोस्क रीसेट करें')}
          </button>
        </div>
      </div>
    </main>
  );
}
