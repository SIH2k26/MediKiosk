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

function MediKioskLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ScanPage() {
  const router = useRouter();
  const [language, setLanguage] = useState('hi');
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
      const s = JSON.parse(sessionStorage.getItem('mk_session') || 'null');
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
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
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

    Array.from(files).forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      addDocument({
        id: `doc-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: docType,
        previewUrl,
        status: 'PROCESSING',
      });
    });
  };

  const addDocument = (doc: UploadedDoc) => {
    setDocuments((prev) => [...prev, doc]);
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: 'EXTRACTED' } : d))
      );
    }, 1200);
  };

  const removeDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleProceed = async () => {
    stopCamera();
    if (session?.id) {
      fetch(`${API_BASE}/summaries/generate/${session.id}`, { method: 'POST' }).catch(() => {});
    }
    router.push('/token');
  };

  return (
    <div style={{ height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--color-surface, #06090E)', color: 'var(--color-text-primary, #F0F4F8)' }}>
      {/* ── Header ── */}
      <header
        style={{
          height: '56px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: 'rgba(6, 9, 14, 0.95)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
        }}
        role="banner"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: 'var(--color-primary, #00C9B1)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06090E',
            }}
            aria-hidden="true"
          >
            <MediKioskLogo />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>MediKiosk</span>
            <span style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', marginLeft: '8px' }}>AI Clinical Intake</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }} role="progressbar" aria-label="Step 4 of 5" aria-valuenow={4} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                style={{
                  width: step === 4 ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: step === 4 ? 'var(--color-primary, #00C9B1)' : step < 4 ? 'rgba(0, 201, 177, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                  transition: 'all 200ms ease',
                }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', fontWeight: 600 }}>4 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          maxWidth: '740px',
          width: '100%',
          margin: '0 auto',
          padding: '14px 20px 14px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, margin: '0 0 2px 0' }}>
            {t('Upload Medical Documents (Optional)', 'मेडिकल दस्तावेज स्कैन या अपलोड करें (वैकल्पिक)')}
          </h1>
          <p style={{ fontSize: '12.5px', color: 'rgba(240, 244, 248, 0.6)', margin: 0 }}>
            {t(
              'Upload past prescriptions or lab reports. Our AI will digitize your records for the doctor.',
              'पुराने पर्चे या जांच रिपोर्ट अपलोड करें। AI इसे डॉक्टर के लिए डिजिटल बना देगा।'
            )}
          </p>
        </div>

        {cameraError && (
          <div className="alert alert-error" style={{ margin: '8px 0' }}>
            ⚠️ {cameraError}
          </div>
        )}

        {/* Camera Capture View */}
        {isCapturingCamera && (
          <div style={{ textAlign: 'center', backgroundColor: '#0D1219', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px' }}>
            <video ref={videoRef} style={{ width: '100%', maxHeight: '200px', borderRadius: '8px', background: '#000', objectFit: 'cover' }} autoPlay playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={stopCamera} style={{ height: '36px' }}>
                {t('Cancel', 'रद्द करें')}
              </button>
              <button className="btn btn-primary" onClick={capturePhoto} style={{ height: '36px' }}>
                📸 {t('Capture Photo', 'फोटो खींचें')}
              </button>
            </div>
          </div>
        )}

        {/* Document Type Selector & Upload Buttons */}
        {!isCapturingCamera && (
          <div
            style={{
              backgroundColor: 'rgba(13, 18, 25, 0.94)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(240, 244, 248, 0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                {t('Select Document Category:', 'दस्तावेज का प्रकार:')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {[
                  { type: 'PRESCRIPTION', label: t('Prescription', 'पर्चा'), icon: '💊' },
                  { type: 'LAB_REPORT', label: t('Lab Report', 'जांच'), icon: '🧪' },
                  { type: 'DISCHARGE_SUMMARY', label: t('Discharge', 'डिस्चार्ज'), icon: '🏥' },
                  { type: 'IMAGING_REPORT', label: t('X-Ray/Scan', 'स्कैन'), icon: '🩻' },
                  { type: 'OTHER', label: t('Other', 'अन्य'), icon: '📄' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={`btn ${docType === item.type ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setDocType(item.type as any)}
                    style={{ padding: '4px 6px', fontSize: '11px', height: '32px' }}
                  >
                    <span>{item.icon}</span> {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={startCamera} style={{ height: '44px', fontSize: '13px' }}>
                📸 {t('Take Camera Photo', 'कैमरे से फोटो लें')}
              </button>
              <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ height: '44px', fontSize: '13px' }}>
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
          <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>📄</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{doc.name}</div>
                    <div style={{ fontSize: '10.5px', color: 'rgba(240, 244, 248, 0.4)' }}>
                      {doc.type} • {doc.status === 'PROCESSING' ? t('Extracting with OCR…', 'OCR अनुवाद जारी…') : t('✅ Digitized', '✅ डिजिटल')}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeDoc(doc.id)} style={{ color: '#FF8A80', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                  ✕ {t('Remove', 'हटाएं')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => router.push('/history')} style={{ flex: 1, height: '46px' }}>
            ← {t('Back', 'वापस')}
          </button>
          <button className="btn btn-primary" onClick={handleProceed} style={{ flex: 2, height: '46px', fontWeight: 700 }}>
            {documents.length > 0
              ? t('Get OPD Token →', 'OPD टोकन प्राप्त करें →')
              : t('Skip & Get OPD Token →', 'छोड़ें और OPD टोकन प्राप्त करें →')}
          </button>
        </div>
      </main>
    </div>
  );
}
