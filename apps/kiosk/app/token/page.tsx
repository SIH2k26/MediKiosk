'use client';

// =============================================================================
// OPD token screen — final step of the kiosk journey
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { makeT, speak, stopSpeaking } from '../../lib/i18n';

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
    <div style={{ height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--color-surface, #06090E)', color: 'var(--color-text-primary, #F0F4F8)' }}>
      {/* ── Header ── */}
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
          <div style={{ display: 'flex', gap: '4px' }} role="progressbar" aria-label="Step 5 of 5" aria-valuenow={5} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                style={{
                  width: step === 5 ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-primary, #00C9B1)',
                  transition: 'all 200ms ease',
                }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', fontWeight: 600 }}>5 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '580px',
          width: '100%',
          margin: '0 auto',
          padding: '16px 20px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(13, 18, 25, 0.94)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px 28px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }} aria-hidden="true">🎟️</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, margin: '0 0 4px 0' }}>
            {t('Your OPD Token', 'आपका ओपीडी टोकन')}
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(240, 244, 248, 0.65)', margin: '0 0 16px 0' }}>
            {t('Your consultation draft has been sent to the doctor.', 'आपकी जांच रिपोर्ट डॉक्टर को भेज दी गई है।')}
          </p>

          <div
            style={{
              padding: '14px 20px',
              backgroundColor: 'rgba(0, 201, 177, 0.06)',
              border: '2px dashed var(--color-primary, #00C9B1)',
              borderRadius: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary, #00C9B1)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              {t('TOKEN NUMBER', 'टोकन नंबर')}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 900, color: '#F0F4F8', letterSpacing: '0.04em' }}>
              {opdToken || 'OPD-20260901-1042'}
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(240, 244, 248, 0.5)', margin: '0 0 16px 0' }}>
            {t('Please proceed to Waiting Area 2 and wait for your token to be called.', 'कृपया प्रतीक्षालय 2 में जाएं और अपना टोकन पुकारे जाने की प्रतीक्षा करें।')}
          </p>

          <button
            onClick={resetKiosk}
            className="btn btn-primary"
            style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: 700 }}
          >
            {t('Done / Next Patient', 'पूर्ण / अगला मरीज')} ({secondsLeft}s)
          </button>
        </div>
      </main>
    </div>
  );
}
