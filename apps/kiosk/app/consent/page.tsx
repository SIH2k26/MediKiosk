'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';

export default function ConsentPage() {
  const router = useRouter();
  
  // Local state
  const [language, setLanguage] = useState('hi');
  const [patient, setPatient] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Read session parameters from storage
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);

    try {
      const storedPatient = sessionStorage.getItem('mk_patient');
      const storedSession = sessionStorage.getItem('mk_session');
      
      if (storedPatient && storedSession) {
        setPatient(JSON.parse(storedPatient));
        setSession(JSON.parse(storedSession));
      } else {
        // Missing session flow — redirect to language screen
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  const translate = (en: string, hi: string) => {
    return language === 'hi' ? hi : en;
  };

  const handleGrantConsent = async () => {
    if (!isChecked || !patient || !session) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Record consent in DB
      await api.submitConsent({
        patientId: patient.id,
        sessionId: session.id,
        consentVersion: '1.0',
      });

      // Proceed to conversational interview
      router.push('/history');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit consent. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    // Clear storage and return to language selection
    sessionStorage.clear();
    router.push('/');
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

        <div className="step-indicator" aria-label="Step 3 of 5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`step-dot ${step === 3 ? 'active' : step < 3 ? 'completed' : ''}`}
            />
          ))}
        </div>
      </header>

      <div className="kiosk-container" style={{ paddingTop: '100px' }}>
        {/* Error message */}
        {errorMsg && (
          <div
            className="fade-in-up"
            style={{
              background: 'rgba(217, 48, 37, 0.12)',
              border: '1px solid var(--color-emergency)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              color: '#FF8A80',
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="card fade-in-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h1 className="text-heading">
              {translate('Consent Form', 'सहमति पत्र')}
            </h1>
            
            {/* Audio Explanation Button (for low literacy) */}
            <button
              onClick={() => setIsAudioPlaying(!isAudioPlaying)}
              className="btn btn-secondary"
              style={{
                minHeight: '48px',
                borderRadius: 'var(--radius-full)',
                padding: '0 1.25rem',
                fontSize: '0.9rem',
                borderColor: isAudioPlaying ? 'var(--color-primary)' : 'var(--color-border)',
                background: isAudioPlaying ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.04)',
              }}
            >
              🔊 {isAudioPlaying ? translate('Stop Audio', 'ऑडियो रोकें') : translate('Listen to Consent', 'सहमति पत्र सुनें')}
            </button>
          </div>

          {/* Audio mock player notification */}
          {isAudioPlaying && (
            <div
              className="fade-in-up"
              style={{
                background: 'rgba(26,115,232,0.1)',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.85rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>🔊</span>
              <span>
                {translate(
                  '[Mock Audio Playing: Explaining how MediKiosk records symptoms, uploads documents, processes data using AI, and presents it to your doctor...]',
                  '[मॉक ऑडियो चल रहा है: कियोस्क आपकी बीमारी, अपलोड किए गए दस्तावेजों को सुरक्षित रखकर, डॉ. को दिखाने के बारे में समझा रहा है...]'
                )}
              </span>
            </div>
          )}

          {/* Consent Text */}
          <div
            className="text-body text-secondary"
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              background: 'rgba(0,0,0,0.2)',
              marginBottom: '2rem',
              fontSize: '1rem',
              lineHeight: 1.7,
            }}
          >
            <p style={{ marginBottom: '1rem' }}>
              <strong>
                {translate(
                  '1. Purpose of Collection:',
                  '1. जानकारी संग्रह का उद्देश्य:'
                )}
              </strong>
              <br />
              {translate(
                'MediKiosk collects your symptoms and digitizes your medical documents to generate a structured clinical draft history. This helps the hospital reduce consultation queue wait times.',
                'मेडिकियॉस्क आपकी बीमारी के लक्षण और आपके पुराने मेडिकल दस्तावेजों को स्कैन करके डिजिटल रूप में एकत्रित करता है। इसका मुख्य उद्देश्य डॉक्टर के कमरे में आपके समय की बचत करना है।'
              )}
            </p>

            <p style={{ marginBottom: '1rem' }}>
              <strong>
                {translate(
                  '2. Artificial Intelligence Processing:',
                  '2. आर्टिफिशियल इंटेलिजेंस (AI) प्रोसेसिंग:'
                )}
              </strong>
              <br />
              {translate(
                'Our clinical AI service extracts medical text from your uploads and transcribes your voice recordings. The AI will formulate a chronological medical timeline for physician review.',
                'हमारा AI सिस्टम आपके स्कैन किए गए पर्चे, जांच रिपोर्ट और आपके द्वारा बोली गई बातों का अनुवाद करके एक संक्षिप्त विवरण (SOAP समरी) तैयार करेगा।'
              )}
            </p>

            <p style={{ marginBottom: '1.5rem' }}>
              <strong>
                {translate(
                  '3. Human Verification & Control:',
                  '3. डॉक्टर द्वारा जांच और नियंत्रण:'
                )}
              </strong>
              <br />
              {translate(
                'All AI output is treated as a clinical draft. It is NOT an autonomous medical diagnosis. Your consulting physician will review, edit, and confirm all details before adding them to your official EHR.',
                'AI द्वारा बनाई गई रिपोर्ट केवल एक ड्राफ्ट/प्रारूप है। यह कोई अंतिम मेडिकल जांच या इलाज का पर्चा नहीं है। आपके डॉक्टर इस रिपोर्ट को पढ़कर, बदल कर और सत्यापित करके ही आपके मुख्य हॉस्पिटल रिकॉर्ड में शामिल करेंगे।'
              )}
            </p>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              {translate(
                'By checking the box below, you grant permission to MediKiosk to store and process your intake parameters.',
                'नीचे दिए गए बॉक्स को चुनकर आप मेडिकियॉस्क को अपनी स्वास्थ्य संबंधी जानकारी सुरक्षित रखने की सहमति प्रदान करते हैं।'
              )}
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div
            onClick={() => setIsChecked(!isChecked)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              background: isChecked ? 'rgba(26,115,232,0.1)' : 'rgba(255,255,255,0.02)',
              border: `2px solid ${isChecked ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              marginBottom: '2.5rem',
              transition: 'all var(--transition-fast)',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '0.5rem',
                border: '2px solid var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isChecked ? 'var(--color-primary)' : 'transparent',
                borderColor: isChecked ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {isChecked && '✓'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {translate('I Accept the Consent terms', 'मैं सहमति पत्र स्वीकार करता हूँ')}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                {translate('Proceed to symptom questionnaire', 'लक्षणों से संबंधित सवाल शुरू करें')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="btn btn-secondary btn-xl"
              style={{ minHeight: '64px' }}
            >
              ❌ {translate('Decline & Go Back', 'अस्वीकार करें')}
            </button>
            
            <button
              onClick={handleGrantConsent}
              disabled={!isChecked || isLoading}
              className="btn btn-primary btn-xl"
              style={{
                minHeight: '64px',
                opacity: isChecked ? 1 : 0.4,
                cursor: isChecked ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? translate('Submitting...', 'जमा हो रहा है...') : `✓ ${translate('Grant Consent & Continue', 'सहमति दें और आगे बढ़ें')}`}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
