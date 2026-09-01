'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../components/ui/button';

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
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-dark text-ink-primary">
      {/* ── Compact Fixed Header ── */}
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

        {/* Step progress */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1" role="progressbar" aria-label="Step 1 of 5" aria-valuenow={1} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  step === 1 ? 'w-5 bg-accent' : 'w-1.5 bg-dark-ruleStrong'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-[11px] text-ink-muted font-semibold">1 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="flex-1 flex flex-col justify-between max-w-[820px] w-full mx-auto px-5 py-4 box-border overflow-hidden">
        {/* Top: Welcome & Heading */}
        <div className="text-center">
          <p className="text-[11px] font-bold text-accent uppercase tracking-widest mb-0.5">
            Welcome · स्वागत है · வரவேற்பு
          </p>
          <h1 className="font-sans text-[clamp(24px,3vh,32px)] font-extrabold mb-1 tracking-tight">
            Choose your <span className="text-accent">language</span>
          </h1>
          <p className="text-[13px] text-ink-secondary m-0">
            Select your preferred language to begin · कृपया अपनी भाषा चुनें
          </p>
        </div>

        {/* Middle: Compact 2x3 Language Grid */}
        <div
          className="grid grid-cols-3 gap-2.5 my-2"
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
                className={`relative flex flex-col items-center justify-center h-[clamp(72px,11vh,90px)] px-3 py-2 rounded-xl transition-all duration-150 outline-none border-2
                  ${isSelected ? 'bg-accent-wash border-accent' : 'bg-dark-raised border-dark-rule hover:border-dark-ruleStrong'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span className="font-sans text-base font-bold text-ink-primary">
                    {lang.nativeName}
                  </span>
                </div>
                <span className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-ink-secondary'}`}>
                  {lang.name}
                </span>

                {isSelected && (
                  <div
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center text-dark text-[10px] font-extrabold"
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
          <Button
            onClick={handleContinue}
            disabled={!selected || isLoading}
            aria-label="Continue to patient identification"
            className="w-full h-[46px] rounded-[10px] text-[15px] font-bold"
          >
            {isLoading ? (
              <span>Setting language…</span>
            ) : (
              <>
                <span>Continue</span>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="ml-2">
                  <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </Button>
        </div>

        {/* Bottom: Notices & Navigation link */}
        <div className="flex flex-col gap-1.5 mt-0.5">
          <div
            className="px-3 py-1.5 bg-accent border border-accent rounded-lg flex items-center gap-2"
            role="note"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <p className="text-[11px] text-ink-secondary m-0 leading-tight">
              <strong className="text-ink-primary">Confidential & secure intake.</strong> आपकी जानकारी गोपनीय और सुरक्षित है।
            </p>
          </div>

          <div
            className="px-3 py-1.5 bg-signal-critical border border-signal-critical rounded-lg flex items-center gap-2"
            role="alert"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-signal-critical shrink-0" />
            <p className="text-[11px] text-signal-critical m-0 leading-tight">
              <strong className="text-signal-critical">Medical emergency?</strong> Please alert hospital staff immediately. / चिकित्सा आपात: कर्मचारियों को सूचित करें।
            </p>
          </div>

          <div className="text-center mt-0.5">
            <Link
              href="/"
              className="text-xs text-ink-muted hover:text-ink-secondary transition-colors no-underline"
            >
              ← Back to MediKiosk Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
