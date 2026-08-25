'use client';
// Phase 2: Patient consent flow with audio explanation, simple language, large controls
export default function ConsentPage() {
  return (
    <main className="kiosk-screen">
      <div className="kiosk-container" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <h1 className="text-heading fade-in-up">Your Consent</h1>
        <p className="text-body text-secondary fade-in-up fade-in-up-delay-1" style={{ marginTop: '1rem' }}>
          This screen is coming in <strong style={{ color: 'var(--color-primary)' }}>Phase 2</strong>.
        </p>
        <p className="text-muted fade-in-up fade-in-up-delay-2" style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
          Will include: audio explanation, consent recording, GRANT / DECLINE controls.
        </p>
      </div>
    </main>
  );
}
