'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col min-h-screen bg-paper text-ink-primary">
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
          <div className="flex gap-1.5" role="progressbar" aria-label="Step 1 of 5" aria-valuenow={1} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 1 ? 'w-8 bg-accent' : 'w-2 bg-paper-raised'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="font-mono text-[12px] tracking-wide text-ink-tertiary">1 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="flex-1 flex flex-col items-center max-w-[1200px] w-full mx-auto px-6 pt-12 pb-24 box-border overflow-y-auto">
        <motion.div 
          className="w-full max-w-[800px] flex flex-col gap-10"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="text-center flex flex-col gap-3">
            <div className="font-mono text-[12px] uppercase tracking-widest text-ink-tertiary">
              Welcome · स्वागत है · வரவேற்பு
            </div>
            <h1 className="font-serif text-[48px] leading-tight text-ink-primary">
              Choose your <span className="text-accent italic">language</span>
            </h1>
            <p className="font-sans text-[16px] text-ink-secondary">
              Select your preferred language to begin · कृपया अपनी भाषा चुनें
            </p>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
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
                  className={`relative flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-200 outline-none border-2 group hover:-translate-y-1 hover:shadow-raised ${
                    isSelected 
                      ? 'bg-accent-wash border-accent shadow-raised' 
                      : 'bg-paper-raised border-rule hover:border-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl leading-none">{lang.flag}</span>
                    <span className={`font-sans text-xl font-bold ${isSelected ? 'text-accent' : 'text-ink-primary'}`}>
                      {lang.nativeName}
                    </span>
                  </div>
                  <span className={`font-sans text-sm font-medium ${isSelected ? 'text-accent/80' : 'text-ink-secondary'}`}>
                    {lang.name}
                  </span>
                  
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        aria-hidden="true"
                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-accent border-4 border-dark flex items-center justify-center text-ink-primary text-sm font-bold shadow-sm"
                      >
                        ✓
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col gap-6 w-full max-w-[400px] mx-auto mt-4">
            <Button
              onClick={handleContinue}
              disabled={!selected || isLoading}
              aria-label="Continue to patient identification"
              className="w-full h-14 rounded-lg text-[16px] font-bold tracking-wide shadow-raised disabled:shadow-none transition-all"
            >
              {isLoading ? (
                <span>Setting language…</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Continue</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </Button>

            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-lg bg-accent-wash text-accent flex items-start gap-3 border border-accent/20" role="note">
                <span className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0" />
                <p className="font-sans text-[13px] m-0 leading-relaxed">
                  <strong>Confidential & secure intake.</strong> आपकी जानकारी गोपनीय और सुरक्षित है।
                </p>
              </div>
              <div className="p-4 rounded-lg bg-signal-warningWash text-signal-critical flex items-start gap-3 border border-signal-critical/20" role="alert">
                <span className="mt-1 w-2 h-2 rounded-full bg-signal-critical shrink-0" />
                <p className="font-sans text-[13px] m-0 leading-relaxed">
                  <strong>Medical emergency?</strong> Please alert hospital staff immediately. / चिकित्सा आपात: कर्मचारियों को सूचित करें।
                </p>
              </div>
            </div>

            <div className="text-center mt-2">
              <Link
                href="/"
                className="font-mono text-[12px] uppercase tracking-wider text-ink-muted hover:text-ink-secondary transition-colors no-underline"
              >
                ← Back to MediKiosk Home
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}





