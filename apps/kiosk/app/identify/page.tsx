'use client';
// Phase 2: Patient identification (ABHA ID / phone number / new registration)
export default function IdentifyPage() {
  return (
    <main className="kiosk-screen">
      <div className="kiosk-container" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <h1 className="text-heading fade-in-up">Patient Identification</h1>
        <p className="text-body text-secondary fade-in-up fade-in-up-delay-1" style={{ marginTop: '1rem' }}>
          This screen is coming in <strong style={{ color: 'var(--color-primary)' }}>Phase 2</strong>.
        </p>
        <p className="text-muted fade-in-up fade-in-up-delay-2" style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
          Will support: ABHA ID, phone number lookup, or new registration.
        </p>
      </div>
    </main>
  );
}
