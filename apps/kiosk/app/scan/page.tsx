'use client';
// Phase 4: Document scan/upload — OCR, entity extraction
export default function ScanPage() {
  return (
    <main className="kiosk-screen">
      <div className="kiosk-container" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <h1 className="text-heading fade-in-up">Scan Your Documents</h1>
        <p className="text-body text-secondary fade-in-up fade-in-up-delay-1" style={{ marginTop: '1rem' }}>
          This screen is coming in <strong style={{ color: 'var(--color-primary)' }}>Phase 4</strong>.
        </p>
        <p className="text-muted fade-in-up fade-in-up-delay-2" style={{ marginTop: '0.5rem', fontSize: '1rem' }}>
          Will include: camera capture, file upload, document preview, OCR progress.
        </p>
      </div>
    </main>
  );
}
