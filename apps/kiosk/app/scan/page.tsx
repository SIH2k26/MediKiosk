'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { makeT } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

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
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper text-ink-primary">
      {/* ── Header ── */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-rule bg-paper shrink-0" role="banner">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center text-ink-primary" aria-hidden="true">
            <MediKioskLogo />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-[17px] font-bold text-ink-primary">MediKiosk</span>
            <span className="font-mono text-[12px] uppercase tracking-wide text-ink-tertiary">Clinical Intake</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" role="progressbar" aria-label="Step 4 of 5" aria-valuenow={4} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 4 ? 'w-8 bg-accent' : step < 4 ? 'w-2 bg-accent/40' : 'w-2 bg-paper-raised'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="font-mono text-[12px] tracking-wide text-ink-tertiary">4 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center">
        <div className="max-w-[1000px] w-full flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {cameraError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-5 py-4 bg-signal-critical/10 border border-signal-critical text-signal-critical rounded-lg text-sm flex items-center gap-3 font-medium">
                <span className="text-lg">⚠️</span> {cameraError}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!isCapturingCamera ? (
              <motion.div key="choose" variants={containerVariants} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-10 items-center w-full">
                <div className="text-center flex flex-col gap-3">
                  <div className="font-mono text-[12px] uppercase tracking-widest text-accent">
                    {t('DOCUMENT UPLOAD', 'दस्तावेज़ अपलोड')}
                  </div>
                  <h1 className="font-serif text-[42px] leading-tight text-ink-primary">
                    {t('Upload Medical Documents (Optional)', 'मेडिकल दस्तावेज स्कैन या अपलोड करें (वैकल्पिक)')}
                  </h1>
                  <p className="font-sans text-[16px] text-ink-secondary m-0 max-w-[600px] mx-auto">
                    {t(
                      'Upload past prescriptions or lab reports. Our AI will digitize your records for the doctor.',
                      'पुराने पर्चे या जांच रिपोर्ट अपलोड करें। AI इसे डॉक्टर के लिए डिजिटल बना देगा।'
                    )}
                  </p>
                </div>

                <div className="w-full max-w-[800px] bg-paper-raised border-2 border-rule rounded-2xl p-8 flex flex-col gap-6 shadow-card">
                  <div>
                    <label className="font-mono text-[12px] font-bold text-ink-secondary uppercase tracking-wider block mb-4">
                      {t('1. Select Document Category', '1. दस्तावेज का प्रकार चुनें')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                          onClick={() => setDocType(item.type as any)}
                          className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                            docType === item.type
                              ? 'bg-accent-wash border-accent text-accent shadow-raised'
                              : 'bg-paper-sunken border-rule hover:border-accent/50 text-ink-primary hover:shadow-raised'
                          }`}
                        >
                          <span className="text-2xl mb-2">{item.icon}</span>
                          <span className="font-sans text-[13px] font-bold leading-tight text-center">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-[12px] font-bold text-ink-secondary uppercase tracking-wider block mb-4">
                      {t('2. Upload or Capture', '2. अपलोड करें या फोटो खींचें')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex items-center justify-center gap-3 h-16 bg-paper-raised border-2 border-rule hover:border-accent rounded-xl font-bold text-ink-primary transition-all hover:shadow-raised"
                        onClick={startCamera}
                      >
                        <span className="text-2xl">📸</span> {t('Take Camera Photo', 'कैमरे से फोटो लें')}
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex items-center justify-center gap-3 h-16 bg-paper-raised border-2 border-rule hover:border-accent rounded-xl font-bold text-ink-primary transition-all hover:shadow-raised"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <span className="text-2xl">📁</span> {t('Upload File / PDF', 'फ़ाइल / PDF चुनें')}
                      </motion.button>
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
                </div>

                {documents.length > 0 && (
                  <div className="w-full max-w-[800px] flex flex-col gap-3">
                    <h3 className="font-mono text-[12px] font-bold text-ink-secondary uppercase tracking-wider m-0">
                      {t('Uploaded Documents', 'अपलोड किए गए दस्तावेज़')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {documents.map((doc) => (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center justify-between p-4 bg-paper-raised border border-rule rounded-xl shadow-card"
                          >
                            <div className="flex items-center gap-4">
                              <img src={doc.previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded bg-paper-sunken" />
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-ink-primary truncate max-w-[150px]">{doc.name}</span>
                                <span className="text-[12px] text-ink-secondary">
                                  {doc.type} • {doc.status === 'PROCESSING' ? t('Extracting…', 'अनुवाद जारी…') : t('✅ Digitized', '✅ डिजिटल')}
                                </span>
                              </div>
                            </div>
                            <button onClick={() => removeDoc(doc.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-signal-critical/10 text-signal-critical hover:bg-signal-critical/20 transition-colors">
                              ✕
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 w-full max-w-[800px] mt-4">
                  <Button variant="outline" onClick={() => router.push('/history')} className="flex-1 h-16 font-bold text-lg">
                    ← {t('Back', 'वापस')}
                  </Button>
                  <Button variant="default" onClick={handleProceed} className="flex-[2] h-16 font-bold shadow-raised text-lg">
                    {documents.length > 0
                      ? t('Get OPD Token →', 'OPD टोकन प्राप्त करें →')
                      : t('Skip & Get OPD Token →', 'छोड़ें और OPD टोकन प्राप्त करें →')}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="camera" variants={containerVariants} initial="hidden" animate="show" exit="exit" className="w-full">
                <Card className="w-full max-w-[800px] mx-auto bg-paper-raised border-rule shadow-raised rounded-2xl overflow-hidden">
                  <CardHeader className="text-center pb-6 border-b border-rule/50">
                    <CardTitle className="font-serif text-[32px] text-ink-primary">{t('Scan Document', 'दस्तावेज़ स्कैन करें')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="relative bg-dark w-full aspect-[4/3] flex items-center justify-center overflow-hidden">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                      <div className="absolute inset-0 border-4 border-accent/50 m-8 rounded-xl pointer-events-none opacity-50" />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="p-6 flex gap-4 bg-paper-sunken">
                      <Button variant="outline" className="flex-1 h-16 font-bold text-lg" onClick={stopCamera}>
                        {t('Cancel', 'रद्द करें')}
                      </Button>
                      <Button variant="default" className="flex-[2] h-16 font-bold shadow-raised text-xl gap-3" onClick={capturePhoto}>
                        <span className="text-2xl">📸</span> {t('Capture Photo', 'फोटो खींचें')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}


