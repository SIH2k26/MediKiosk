'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import '../../globals.css';

function VerifiedContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const hasError  = params.get('error') === 'true';

  if (hasError) {
    return (
      <main className="kiosk-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.25rem' }}>❌</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Verification Failed
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            The verification link may have expired or already been used. Please request a new one by registering or logging in.
          </p>
          <a href="/identify" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.875rem 2rem' }}>
            Back to Check-in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="kiosk-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 520, padding: '2rem' }}>
        {/* Animated checkmark */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
          <div style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'rgba(30, 142, 62, 0.12)',
            border: '2px solid rgba(30, 142, 62, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.75rem',
            margin: '0 auto',
          }}>
            ✅
          </div>
        </div>

        <h1 style={{ fontSize: '1.875rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
          Email Verified!
        </h1>
        <p style={{ color: '#69F0AE', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
          Your MediKiosk account is now fully activated.
        </p>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '2.5rem', fontSize: '0.9rem' }}>
          You can now sign in with your email and password on any future visit to access your saved medical history.
        </p>

        {/* Card with next steps */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '1.25rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>
            What's next
          </p>
          {[
            { icon: '🏥', text: 'Visit a MediKiosk terminal at your hospital' },
            { icon: '🔐', text: 'Select "I have an account" and sign in' },
            { icon: '📋', text: 'Your medical history will be pre-loaded' },
            { icon: '👩‍⚕️', text: 'Your doctor receives a structured summary before you arrive' },
          ].map((step) => (
            <div key={step.text} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.625rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ flexShrink: 0 }}>{step.icon}</span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>

        <a
          href="/start"
          className="btn btn-primary"
          style={{ display: 'inline-flex', padding: '0.875rem 2.5rem', fontSize: '1rem' }}
        >
          Go to Patient Kiosk →
        </a>

        <div style={{ marginTop: '1rem' }}>
          <a href="/" style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            ← Back to MediKiosk Home
          </a>
        </div>
      </div>
    </main>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F1117' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#1A73E8', borderRadius: '50%', animation: 'spin 700ms linear infinite' }} />
      </div>
    }>
      <VerifiedContent />
    </Suspense>
  );
}
