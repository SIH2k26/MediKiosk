'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const LANGUAGES = [
  { code: 'hi', name: 'Hindi',   nativeName: 'हिन्दी',   script: 'देवनागरी', flag: '🇮🇳' },
  { code: 'en', name: 'English', nativeName: 'English',  script: 'Latin',     flag: '🇬🇧' },
  { code: 'ta', name: 'Tamil',   nativeName: 'தமிழ்',    script: 'Tamil',     flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',  nativeName: 'తెలుగు',   script: 'Telugu',    flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা',    script: 'Bengali',   flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी',    script: 'Devanagari',flag: '🇮🇳' },
] as const;

function MediKioskLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function LanguageSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected || isLoading) return;
    setIsLoading(true);
    sessionStorage.setItem('mk_lang', selected);
    router.push('/identify');
  };

  return (
    <div style={{ height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--color-surface, #06090E)', color: 'var(--color-text-primary, #F0F4F8)' }}>
      {/* ── Compact Fixed Header ── */}
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

        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }} role="progressbar" aria-label="Step 1 of 5" aria-valuenow={1} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                style={{
                  width: step === 1 ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: step === 1 ? 'var(--color-primary, #00C9B1)' : 'rgba(255, 255, 255, 0.15)',
                  transition: 'all 200ms ease',
                }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', fontWeight: 600 }}>1 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content (Flex Container - No Scroll) ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          maxWidth: '820px',
          width: '100%',
          margin: '0 auto',
          padding: '16px 20px 12px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Top: Welcome & Heading */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary, #00C9B1)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 2px 0' }}>
            Welcome · स्वागत है · வரவேற்பு
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vh, 32px)', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Choose your <span style={{ color: 'var(--color-primary, #00C9B1)' }}>language</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(240, 244, 248, 0.65)', margin: 0 }}>
            Select your preferred language to begin · कृपया अपनी भाषा चुनें
          </p>
        </div>

        {/* Middle: Compact 2x3 Language Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            margin: '8px 0',
          }}
          role="radiogroup"
          aria-label="Language selection"
        >
          {LANGUAGES.map(lang => {
            const isSelected = selected === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${lang.name} — ${lang.nativeName}`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 'clamp(72px, 11vh, 90px)',
                  padding: '8px 12px',
                  backgroundColor: isSelected ? 'rgba(0, 201, 177, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1.5px solid ${isSelected ? 'var(--color-primary, #00C9B1)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '12px',
                  boxShadow: isSelected ? '0 0 0 3px rgba(0, 201, 177, 0.2), 0 4px 16px rgba(0, 201, 177, 0.15)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>{lang.flag}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: '#F0F4F8' }}>
                    {lang.nativeName}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: isSelected ? 'var(--color-primary, #00C9B1)' : 'rgba(240, 244, 248, 0.45)', fontWeight: 500 }}>
                  {lang.name}
                </span>

                {isSelected && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary, #00C9B1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#06090E',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}
                  >
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action: Continue Button */}
        <div>
          <button
            onClick={handleContinue}
            disabled={!selected || isLoading}
            aria-label="Continue to patient identification"
            style={{
              width: '100%',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-primary, #00C9B1)',
              color: '#06090E',
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '10px',
              border: 'none',
              cursor: selected ? 'pointer' : 'not-allowed',
              opacity: selected ? 1 : 0.35,
              transition: 'all 150ms ease',
              boxShadow: selected ? '0 4px 16px rgba(0, 201, 177, 0.25)' : 'none',
            }}
          >
            {isLoading ? (
              <span>Setting language…</span>
            ) : (
              <>
                <span>Continue</span>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Bottom: Notices & Navigation link */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            role="note"
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />
            <p style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.75)', margin: 0, lineHeight: 1.4 }}>
              <strong>Confidential & secure intake.</strong> आपकी जानकारी गोपनीय और सुरक्षित है।
            </p>
          </div>

          <div
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            role="alert"
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444', flexShrink: 0 }} />
            <p style={{ fontSize: '11px', color: '#FCA5A5', margin: 0, lineHeight: 1.4 }}>
              <strong>Medical emergency?</strong> Please alert hospital staff immediately. / चिकित्सा आपात: कर्मचारियों को सूचित करें।
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2px' }}>
            <Link
              href="/"
              style={{ fontSize: '12px', color: 'rgba(240, 244, 248, 0.4)', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseOver={e => (e.currentTarget.style.color = 'rgba(240, 244, 248, 0.8)')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(240, 244, 248, 0.4)')}
            >
              ← Back to MediKiosk Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
