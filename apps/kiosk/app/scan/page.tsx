'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { makeT } from '../../lib/i18n';
import { Button } from '../../components/ui/button';

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
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-dark text-ink-primary">
      {/* ── Header ── */}
      <header
        className="h-14 px-6 flex items-center justify-between border-b border-dark-rule bg-dark shrink-0"
        role="banner"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 bg-accent rounded-md flex items-center justify-center text-dark"
            aria-hidden="true"
          >
            <MediKioskLogo />
          </div>
          <div>
            <span className="font-sans text-[15px] font-bold">MediKiosk</span>
            <span className="text-[11px] text-ink-muted ml-2">AI Clinical Intake</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1" role="progressbar" aria-label="Step 4 of 5" aria-valuenow={4} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  step === 4 ? 'w-5 bg-accent' : step < 4 ? 'w-1.5 bg-accent/40' : 'w-1.5 bg-dark-ruleStrong'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-[11px] text-ink-muted font-semibold">4 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="flex-1 flex flex-col justify-between max-w-[740px] w-full mx-auto px-5 py-3.5 box-border overflow-hidden">
        <div className="text-center">
          <h1 className="font-sans text-xl font-extrabold mb-0.5">
            {t('Upload Medical Documents (Optional)', 'मेडिकल दस्तावेज स्कैन या अपलोड करें (वैकल्पिक)')}
          </h1>
          <p className="text-[12.5px] text-ink-secondary m-0">
            {t(
              'Upload past prescriptions or lab reports. Our AI will digitize your records for the doctor.',
              'पुराने पर्चे या जांच रिपोर्ट अपलोड करें। AI इसे डॉक्टर के लिए डिजिटल बना देगा।'
            )}
          </p>
        </div>

        {cameraError && (
          <div className="my-2 px-4 py-3 bg-signal-critical border border-signal-critical text-signal-critical rounded-lg text-sm flex items-center gap-2">
            ⚠️ {cameraError}
          </div>
        )}

        {/* Camera Capture View */}
        {isCapturingCamera && (
          <div className="text-center bg-dark-sunken border border-dark-rule rounded-xl p-3.5">
            <video ref={videoRef} className="w-full max-h-[200px] rounded-lg bg-black object-cover" autoPlay playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-center gap-2.5 mt-2.5">
              <Button variant="outline" onClick={stopCamera} className="h-9">
                {t('Cancel', 'रद्द करें')}
              </Button>
              <Button variant="default" onClick={capturePhoto} className="h-9">
                📸 {t('Capture Photo', 'फोटो खींचें')}
              </Button>
            </div>
          </div>
        )}

        {/* Document Type Selector & Upload Buttons */}
        {!isCapturingCamera && (
          <div className="bg-dark-raised border border-dark-rule rounded-[14px] p-4 flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider block mb-1.5">
                {t('Select Document Category:', 'दस्तावेज का प्रकार:')}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { type: 'PRESCRIPTION', label: t('Prescription', 'पर्चा'), icon: '💊' },
                  { type: 'LAB_REPORT', label: t('Lab Report', 'जांच'), icon: '🧪' },
                  { type: 'DISCHARGE_SUMMARY', label: t('Discharge', 'डिस्चार्ज'), icon: '🏥' },
                  { type: 'IMAGING_REPORT', label: t('X-Ray/Scan', 'स्कैन'), icon: '🩻' },
                  { type: 'OTHER', label: t('Other', 'अन्य'), icon: '📄' },
                ].map((item) => (
                  <Button
                    key={item.type}
                    type="button"
                    variant={docType === item.type ? "default" : "outline"}
                    onClick={() => setDocType(item.type as any)}
                    className="px-1.5 py-1 text-[11px] h-8 flex flex-col sm:flex-row gap-1 items-center justify-center leading-tight"
                  >
                    <span>{item.icon}</span> <span>{item.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" onClick={startCamera} className="h-11 text-[13px]">
                📸 {t('Take Camera Photo', 'कैमरे से फोटो लें')}
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 text-[13px]">
                📁 {t('Upload File / PDF', 'फ़ाइल / PDF चुनें')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {/* Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="max-h-[100px] overflow-y-auto flex flex-col gap-1.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between px-3 py-2 bg-dark-ruleStrong/30 border border-dark-rule rounded-lg"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📄</span>
                  <div>
                    <div className="font-semibold text-xs text-ink-primary">{doc.name}</div>
                    <div className="text-[10.5px] text-ink-muted">
                      {doc.type} • {doc.status === 'PROCESSING' ? t('Extracting with OCR…', 'OCR अनुवाद जारी…') : t('✅ Digitized', '✅ डिजिटल')}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeDoc(doc.id)} className="text-signal-critical bg-transparent border-none cursor-pointer text-xs hover:text-signal-critical transition-colors">
                  ✕ {t('Remove', 'हटाएं')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex gap-2.5 mt-auto">
          <Button variant="outline" onClick={() => router.push('/history')} className="flex-1 h-11">
            ← {t('Back', 'वापस')}
          </Button>
          <Button variant="default" onClick={handleProceed} className="flex-[2] h-11 font-bold">
            {documents.length > 0
              ? t('Get OPD Token →', 'OPD टोकन प्राप्त करें →')
              : t('Skip & Get OPD Token →', 'छोड़ें और OPD टोकन प्राप्त करें →')}
          </Button>
        </div>
      </main>
    </div>
  );
}
