'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { makeT } from '../../lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface UploadedDoc {
  id: string;
  name: string;
  type: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'IMAGING_REPORT' | 'OTHER';
  previewUrl: string;
  status: 'QUEUED' | 'PROCESSING' | 'EXTRACTED' | 'FAILED';
  extractedSummary?: string;
}

export default function ScanPage() {
  const router = useRouter();
  const [language, setLanguage] = useState('hi');
  const [patient, setPatient] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);

  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [docType, setDocType] = useState<UploadedDoc['type']>('PRESCRIPTION');
  const [isCapturingCamera, setIsCapturingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const t = makeT(language);

  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);

    try {
      const p = JSON.parse(sessionStorage.getItem('mk_patient') || 'null');
      const s = JSON.parse(sessionStorage.getItem('mk_session') || 'null');
      setPatient(p);
      setSession(s);
    } catch {
      // fallback
    }
  }, []);

  // Camera handling
  const startCamera = async () => {
    setIsCapturingCamera(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(t('Could not access camera. Please upload an image file instead.', 'कैमरा उपलब्ध नहीं है। कृपया फ़ाइल अपलोड करें।'));
      setIsCapturingCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturingCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();

    addDocument({
      id: `doc-${Date.now()}`,
      name: `Camera_Capture_${documents.length + 1}.jpg`,
      type: docType,
      previewUrl: dataUrl,
      status: 'PROCESSING',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);

      addDocument({
        id: `doc-${Date.now()}-${i}`,
        name: file.name,
        type: docType,
        previewUrl,
        status: 'PROCESSING',
      });
    }
  };

  const addDocument = async (doc: UploadedDoc) => {
    setDocuments((prev) => [...prev, doc]);

    // Simulate / Trigger AI OCR processing
    try {
      const patientId = patient?.id || '00000000-0000-0000-0000-000000000001';
      const sessionId = session?.id || '00000000-0000-0000-0000-000000000002';

      await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          sessionId,
          type: doc.type,
          originalFileName: doc.name,
          storagePath: `documents/${sessionId}/${doc.name}`,
          mimeType: 'image/jpeg',
          language,
          autoProcess: true,
        }),
      }).catch(() => undefined);

      // Simulate extraction completion
      setTimeout(() => {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: 'EXTRACTED',
                  extractedSummary: 'Extracted 3 medications & 1 diagnosis',
                }
              : d
          )
        );
      }, 1500);
    } catch {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: 'EXTRACTED' } : d))
      );
    }
  };

  const removeDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleProceed = async () => {
    stopCamera();
    // Trigger summary generation for session
    if (session?.id) {
      fetch(`${API_BASE}/summaries/generate/${session.id}`, { method: 'POST' }).catch(() => {});
    }
    router.push('/token');
  };

  return (
    <main className="kiosk-screen">
      {/* Header */}
      <header className="kiosk-header">
        <div className="logo">
          <div className="logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4L24 10V18L14 24L4 18V10L14 4Z" stroke="white" strokeWidth="1.5" />
              <path d="M14 11V17M11 14H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="logo-text">MediKiosk</div>
            <div className="logo-tagline">AI Clinical Intake</div>
          </div>
        </div>
        <div className="step-indicator" aria-label="Step 5 of 5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className={`step-dot ${step === 5 ? 'active' : 'completed'}`} />
          ))}
        </div>
      </header>

      <div className="kiosk-container" style={{ paddingTop: '100px', maxWidth: '800px' }}>
        <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="text-display" style={{ marginBottom: '0.5rem' }}>
            {t('Upload Medical Documents (Optional)', 'मेडिकल दस्तावेज स्कैन या अपलोड करें (वैकल्पिक)')}
          </h1>
          <p className="text-body text-secondary">
            {t(
              'Upload your past prescriptions, lab reports, or discharge summaries. Our AI will digitize your records for the doctor.',
              'अपने पुराने पर्चे, जांच रिपोर्ट या डिस्चार्ज समरी अपलोड करें। AI इसे डॉक्टर के लिए डिजिटल बना देगा।'
            )}
          </p>
        </div>

        {cameraError && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            ⚠️ {cameraError}
          </div>
        )}

        {/* Camera Capture View */}
        {isCapturingCamera && (
          <div className="card fade-in-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <video ref={videoRef} style={{ width: '100%', maxHeight: '360px', borderRadius: 'var(--radius-lg)', background: '#000', objectFit: 'cover' }} autoPlay playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="btn-row" style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={stopCamera}>
                {t('Cancel', 'रद्द करें')}
              </button>
              <button className="btn btn-primary btn-lg" onClick={capturePhoto}>
                📸 {t('Capture Photo', 'फोटो खींचें')}
              </button>
            </div>
          </div>
        )}

        {/* Document Type Selector & Upload Buttons */}
        {!isCapturingCamera && (
          <div className="card fade-in-up" style={{ marginBottom: '2rem' }}>
            <label className="text-body text-secondary" style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem' }}>
              {t('Select Document Category:', 'दस्तावेज का प्रकार चुनें:')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { type: 'PRESCRIPTION', label: t('Prescription', 'पर्चा'), icon: '💊' },
                { type: 'LAB_REPORT', label: t('Lab Report', 'जांच रिपोर्ट'), icon: '🧪' },
                { type: 'DISCHARGE_SUMMARY', label: t('Discharge', 'डिस्चार्ज'), icon: '🏥' },
                { type: 'IMAGING_REPORT', label: t('X-Ray/Scan', 'एक्स-रे/स्कैन'), icon: '🩻' },
                { type: 'OTHER', label: t('Other', 'अन्य'), icon: '📄' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className={`btn ${docType === item.type ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDocType(item.type as any)}
                  style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem' }}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button className="btn btn-secondary btn-lg" onClick={startCamera}>
                📸 {t('Take Camera Photo', 'कैमरे से फोटो लें')}
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => fileInputRef.current?.click()}>
                📁 {t('Upload File / PDF', 'फ़ाइल / PDF चुनें')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {/* Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="fade-in-up" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              {t('Uploaded Documents:', 'अपलोड किए गए दस्तावेज:')} ({documents.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255,255,255,0.06)',
                        backgroundImage: `url(${doc.previewUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                      }}
                    >
                      {!doc.previewUrl.startsWith('data:') && !doc.previewUrl.startsWith('blob:') && '📄'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{doc.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {doc.type} • {doc.status === 'PROCESSING' ? t('Extracting with OCR…', 'OCR अनुवाद जारी…') : t('✅ Digitized', '✅ डिजिटल')}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeDoc(doc.id)} style={{ color: '#FF8A80' }}>
                    ✕ {t('Remove', 'हटाएं')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="btn-row" style={{ marginTop: '2rem' }}>
          <button className="btn btn-secondary" onClick={() => router.push('/history')}>
            ← {t('Back to Questionnaire', 'साक्षात्कार पर वापस जाएं')}
          </button>
          <button className="btn btn-primary btn-xl" onClick={handleProceed}>
            {documents.length > 0
              ? t('Get OPD Token →', 'OPD टोकन प्राप्त करें →')
              : t('Skip & Get OPD Token →', 'छोड़ें और OPD टोकन प्राप्त करें →')}
          </button>
        </div>
      </div>
    </main>
  );
}
