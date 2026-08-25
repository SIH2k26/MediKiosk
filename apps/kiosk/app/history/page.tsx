'use client';
// Phase 3: Conversational history interview — voice + touch, adaptive questioning
export default function HistoryPage() {
  return (
    <main className="kiosk-screen">
      <div className="kiosk-container" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <h1 className="text-heading fade-in-up">Medical History Interview</h1>
        <p className="text-body text-secondary fade-in-up fade-in-up-delay-1" style={{ marginTop: '1rem' }}>
          This screen is coming in <strong style={{ color: 'var(--color-primary)' }}>Phase 3</strong>.
        </p>
        <p className="text-muted fade-in-up fade-in-up-delay-2" style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
          Will include: voice input (Bhashini ASR), touch options, adaptive questioning, red-flag detection.
        </p>
      </div>
    </main>
  );
}
