'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Language options supported by MediKiosk
const LANGUAGES = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', emoji: '🇮🇳' },
  { code: 'en', name: 'English', nativeName: 'English', emoji: '🇬🇧' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', emoji: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', emoji: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', emoji: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', emoji: '🇮🇳' },
] as const;

export default function LanguageSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLanguageSelect = (code: string) => {
    setSelected(code);
  };

  const handleContinue = async () => {
    if (!selected) return;
    setIsLoading(true);
    sessionStorage.setItem('mk_lang', selected);
    router.push('/identify');
  };

  return (
    <main className="kiosk-screen">
      {/* Header */}
      <header className="kiosk-header">
        <div className="logo">
          <div className="logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4L24 10V18L14 24L4 18V10L14 4Z" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M14 11V17M11 14H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="logo-text">MediKiosk</div>
            <div className="logo-tagline">AI Clinical Intake</div>
          </div>
        </div>

        <div className="step-indicator" aria-label="Step 1 of 5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`step-dot ${step === 1 ? 'active' : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </header>

      {/* Main content */}
      <div className="kiosk-container" style={{ paddingTop: '100px' }}>

        {/* Welcome heading */}
        <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 className="text-display" style={{ marginBottom: '1rem' }}>
            Welcome to <span className="text-primary-color">MediKiosk</span>
          </h1>
          <p className="text-body text-secondary" style={{ maxWidth: '560px', margin: '0 auto' }}>
            Please select your preferred language to begin your medical history.
          </p>
          <p className="text-body text-muted" style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>
            कृपया अपनी भाषा चुनें &bull; Please choose your language
          </p>
        </div>

        {/* Language grid */}
        <div
          className="fade-in-up fade-in-up-delay-1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '2rem',
          }}
          role="radiogroup"
          aria-label="Language selection"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`lang-card ${selected === lang.code ? 'selected' : ''}`}
              onClick={() => handleLanguageSelect(lang.code)}
              role="radio"
              aria-checked={selected === lang.code}
              aria-label={`${lang.name} — ${lang.nativeName}`}
            >
              <span className="lang-card-emoji" aria-hidden="true">
                {lang.emoji}
              </span>
              <span className="lang-card-native">{lang.nativeName}</span>
              <span className="lang-card-name" style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {lang.name}
              </span>
              {selected === lang.code && (
                <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Continue button */}
        <div className="fade-in-up fade-in-up-delay-2">
          <button
            className={`btn btn-primary btn-xl ${!selected || isLoading ? 'btn-disabled' : ''}`}
            onClick={handleContinue}
            disabled={!selected || isLoading}
            aria-label="Continue to patient identification"
            style={{
              opacity: selected ? 1 : 0.4,
              cursor: selected ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <>
                <span aria-hidden="true">⟳</span>
                Loading...
              </>
            ) : (
              <>
                Continue
                <span aria-hidden="true" style={{ marginLeft: '0.5rem' }}>→</span>
              </>
            )}
          </button>
        </div>

        {/* Privacy notice */}
        <div
          className="fade-in-up fade-in-up-delay-3"
          style={{ textAlign: 'center', marginTop: '1.5rem' }}
        >
          <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
            🔒 Your information is confidential and protected.
            <br />
            आपकी जानकारी गोपनीय और सुरक्षित है।
          </p>
        </div>

        {/* Emergency assistance */}
        <div
          className="fade-in-up fade-in-up-delay-4"
          style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(217, 48, 37, 0.08)',
            border: '1px solid rgba(217, 48, 37, 0.2)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#FF6B6B', fontSize: '0.875rem', fontWeight: 600 }}>
            🚨 If you have a medical emergency, please alert the staff immediately.
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            यदि आपको चिकित्सा आपातकाल है, तो तुरंत कर्मचारियों को सूचित करें।
          </p>
        </div>

        {/* Back to home link */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a
            href="/"
            style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            ← Back to MediKiosk Home
          </a>
        </div>
      </div>
    </main>
  );
}
