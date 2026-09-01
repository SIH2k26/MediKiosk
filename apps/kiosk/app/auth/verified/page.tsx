'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function VerifiedContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const hasError  = params.get('error') === 'true';

  if (hasError) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-dark text-ink-primary p-6">
        <div className="text-center w-full max-w-[480px]">
          <div className="text-6xl mb-5">❌</div>
          <h1 className="font-sans text-3xl font-extrabold mb-3 tracking-tight">
            Verification Failed
          </h1>
          <p className="text-ink-secondary mb-8 leading-relaxed">
            The verification link may have expired or already been used. Please request a new one by registering or logging in.
          </p>
          <Link
            href="/identify"
            className="inline-flex items-center justify-center rounded-md font-sans font-medium transition-colors bg-accent text-dark hover:bg-accent/90 shadow-card h-11 px-8"
          >
            Back to Check-in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-dark text-ink-primary p-6">
      <div className="text-center w-full max-w-[520px]">
        {/* Animated checkmark */}
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-full bg-accent border-2 border-accent flex items-center justify-center text-4xl mx-auto">
            ✅
          </div>
        </div>

        <h1 className="font-sans text-3xl font-black tracking-tight mb-3">
          Email Verified!
        </h1>
        <p className="text-accent font-semibold mb-4">
          Your MediKiosk account is now fully activated.
        </p>
        <p className="text-ink-secondary leading-relaxed mb-10 text-sm">
          You can now sign in with your email and password on any future visit to access your saved medical history.
        </p>

        {/* Card with next steps */}
        <div className="bg-dark-raised border border-dark-rule rounded-2xl p-6 mb-6 text-left shadow-card">
          <p className="text-[13px] font-bold text-ink-muted uppercase tracking-widest mb-3.5">
            What's next
          </p>
          {[
            { icon: '🏥', text: 'Visit a MediKiosk terminal at your hospital' },
            { icon: '🔐', text: 'Select "I have an account" and sign in' },
            { icon: '📋', text: 'Your medical history will be pre-loaded' },
            { icon: '👩‍⚕️', text: 'Your doctor receives a structured summary before you arrive' },
          ].map((step) => (
            <div key={step.text} className="flex gap-3 mb-2.5 text-sm text-ink-secondary">
              <span className="shrink-0">{step.icon}</span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>

        <Link
          href="/start"
          className="inline-flex items-center justify-center rounded-md font-sans font-medium transition-colors bg-accent text-dark hover:bg-accent/90 shadow-card h-11 px-10 text-base"
        >
          Go to Patient Kiosk →
        </Link>

        <div className="mt-4">
          <Link href="/" className="text-sm text-ink-muted hover:text-ink-secondary transition-colors no-underline">
            ← Back to MediKiosk Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="w-10 h-10 border-4 border-white/10 border-t-accent rounded-full animate-spin" />
      </div>
    }>
      <VerifiedContent />
    </Suspense>
  );
}
