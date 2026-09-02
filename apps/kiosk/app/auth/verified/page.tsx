'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

function VerifiedContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const hasError  = params.get('error') === 'true';

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
  };

  if (hasError) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-paper text-ink-primary p-6">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="text-center w-full max-w-[600px] bg-paper-raised border-2 border-signal-critical rounded-3xl p-12 shadow-2xl">
          <motion.div variants={containerVariants} className="text-7xl mb-6">❌</motion.div>
          <motion.h1 variants={containerVariants} className="font-serif text-[42px] font-bold text-signal-critical mb-4 tracking-tight leading-tight">
            Verification Failed
          </motion.h1>
          <motion.p variants={containerVariants} className="font-sans text-[18px] text-ink-secondary mb-10 leading-relaxed">
            The verification link may have expired or already been used. Please request a new one by registering or logging in.
          </motion.p>
          <motion.div variants={containerVariants}>
            <Link
              href="/identify"
              className="inline-flex items-center justify-center rounded-xl font-sans font-bold transition-all bg-signal-critical text-paper hover:bg-signal-critical/90 shadow-raised h-16 px-10 text-xl"
            >
              Back to Check-in
            </Link>
          </motion.div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-paper text-ink-primary p-6">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="text-center w-full max-w-[700px]">
        {/* Animated checkmark */}
        <motion.div variants={containerVariants} className="relative inline-block mb-8">
          <div className="w-32 h-32 rounded-2xl bg-accent border-4 border-accent flex items-center justify-center text-6xl mx-auto shadow-raised">
            ✅
          </div>
        </motion.div>

        <motion.h1 variants={containerVariants} className="font-serif text-[56px] font-bold tracking-tight text-ink-primary mb-4 leading-tight">
          Email Verified!
        </motion.h1>
        <motion.p variants={containerVariants} className="font-sans text-[22px] text-accent font-bold mb-4">
          Your MediKiosk account is now fully activated.
        </motion.p>
        <motion.p variants={containerVariants} className="font-sans text-[18px] text-ink-secondary leading-relaxed mb-12">
          You can now sign in with your email and password on any future visit to access your saved medical history.
        </motion.p>

        {/* Card with next steps */}
        <motion.div variants={containerVariants} className="bg-paper-raised border-2 border-rule rounded-3xl p-10 mb-10 text-left shadow-card">
          <p className="font-mono text-[14px] font-bold text-ink-secondary uppercase tracking-widest mb-6">
            What's next
          </p>
          <div className="flex flex-col gap-5">
            {[
              { icon: '🏥', text: 'Visit a MediKiosk terminal at your hospital' },
              { icon: '🔐', text: 'Select "I have an account" and sign in' },
              { icon: '📋', text: 'Your medical history will be pre-loaded' },
              { icon: '👩‍⚕️', text: 'Your doctor receives a structured summary before you arrive' },
            ].map((step) => (
              <div key={step.text} className="flex gap-4 items-center font-sans text-[18px] text-ink-primary">
                <span className="text-2xl shrink-0">{step.icon}</span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={containerVariants} className="flex flex-col gap-6 items-center">
          <Link
            href="/start"
            className="inline-flex items-center justify-center rounded-xl font-sans font-bold transition-all bg-accent text-ink-primary hover:bg-accent/90 shadow-raised h-16 px-12 text-xl"
          >
            Go to Patient Kiosk →
          </Link>

          <Link href="/" className="font-mono text-[14px] uppercase tracking-wider text-ink-muted hover:text-ink-secondary transition-colors no-underline">
            ← Back to MediKiosk Home
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-paper">
        <div className="w-16 h-16 border-4 border-rule border-t-accent rounded-xl animate-spin" />
      </div>
    }>
      <VerifiedContent />
    </Suspense>
  );
}
