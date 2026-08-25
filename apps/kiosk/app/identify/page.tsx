'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';

export default function IdentifyPage() {
  const router = useRouter();
  
  // Intake state
  const [language, setLanguage] = useState('hi');
  const [intakeMode, setIntakeMode] = useState<'CHOOSE' | 'PHONE' | 'REGISTER'>('CHOOSE');
  
  // Forms state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  
  // Verification states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [existingPatient, setExistingPatient] = useState<any | null>(null);

  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);
  }, []);

  const translate = (en: string, hi: string) => {
    return language === 'hi' ? hi : en;
  };

  // Trigger patient creation & session start
  const handleProceed = async (patientData: any) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Step 1: Create or fetch patient record in DB
      const patient = await api.createPatient(patientData);
      sessionStorage.setItem('mk_patient', JSON.stringify(patient));
      
      // Step 2: Initialize intake session
      const session = await api.startSession(patient.id, language);
      sessionStorage.setItem('mk_session', JSON.stringify(session));

      // Step 3: Proceed to consent form
      router.push('/consent');
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  // Lookup existing user by phone number
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      setErrorMsg(translate('Please enter a valid 10-digit mobile number.', 'कृपया सही 10-अंकीय मोबाइल नंबर दर्ज करें।'));
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Lookup / create patient by phone number
      const patient = await api.createPatient({
        firstName: translate('Walk-in', 'आगंतुक'),
        lastName: 'Patient',
        phone: phoneNumber,
        preferredLanguage: language as any,
        isAnonymous: false,
      });

      // If it's a freshly created stub, let's collect their actual name
      if (patient.firstName === 'Walk-in' || patient.firstName === 'आगंतुक') {
        setExistingPatient(patient);
        setIntakeMode('REGISTER');
      } else {
        // Patient already has a complete profile, proceed directly
        await handleProceed(patient);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Register new user details
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !age || !gender) {
      setErrorMsg(translate('All fields are required.', 'सभी जानकारी भरना अनिवार्य है।'));
      return;
    }

    const patientPayload = {
      firstName,
      lastName,
      age: parseInt(age, 10),
      gender: gender as any,
      phone: phoneNumber || undefined,
      preferredLanguage: language as any,
      isAnonymous: false,
    };

    await handleProceed(patientPayload);
  };

  // Anonymous Intake (skip registration)
  const handleAnonymousIntake = async () => {
    const anonymousPayload = {
      firstName: translate('Kiosk', 'कियोस्क'),
      lastName: translate('Walk-in', 'आगंतुक'),
      preferredLanguage: language as any,
      isAnonymous: true,
    };

    await handleProceed(anonymousPayload);
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

        <div className="step-indicator" aria-label="Step 2 of 5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`step-dot ${step === 2 ? 'active' : step < 2 ? 'completed' : ''}`}
            />
          ))}
        </div>
      </header>

      <div className="kiosk-container" style={{ paddingTop: '100px' }}>
        {/* Display Error Message */}
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

        {/* 1. CHOOSE INTENT MODE */}
        {intakeMode === 'CHOOSE' && (
          <div style={{ textAlign: 'center' }}>
            <div className="fade-in-up" style={{ marginBottom: '2.5rem' }}>
              <h1 className="text-display" style={{ marginBottom: '1rem' }}>
                {translate('Identify Yourself', 'अपनी पहचान बताएं')}
              </h1>
              <p className="text-body text-secondary">
                {translate(
                  'Choose how you want to check-in for your clinical consultation today.',
                  'आज परामर्श के लिए अपनी चेक-इन विधि का चयन करें।'
                )}
              </p>
            </div>

            <div
              className="fade-in-up fade-in-up-delay-1"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}
            >
              {/* Phone option */}
              <button
                className="lang-card"
                onClick={() => setIntakeMode('PHONE')}
                style={{ minHeight: '180px' }}
              >
                <span style={{ fontSize: '3rem' }}>📱</span>
                <span className="lang-card-name">
                  {translate('Register/Login with Phone', 'फ़ोन नंबर से लॉगिन करें')}
                </span>
                <span className="lang-card-native" style={{ fontSize: '0.9rem' }}>
                  {translate('Saves history for future visits', 'भविष्य के लिए जानकारी सुरक्षित रखेगा')}
                </span>
              </button>

              {/* Walk-in option */}
              <button
                className="lang-card"
                onClick={handleAnonymousIntake}
                disabled={isLoading}
                style={{ minHeight: '180px' }}
              >
                <span style={{ fontSize: '3rem' }}>🚶‍♂️</span>
                <span className="lang-card-name">
                  {translate('Quick Walk-in (Anonymous)', 'त्वरित आगंतुक प्रवेश')}
                </span>
                <span className="lang-card-native" style={{ fontSize: '0.9rem' }}>
                  {translate('Direct check-in without registration', 'बिना पंजीकरण सीधे प्रवेश करें')}
                </span>
              </button>
            </div>

            <div className="fade-in-up fade-in-up-delay-2">
              <button className="btn btn-secondary btn-xl" onClick={() => router.push('/')}>
                ← {translate('Go Back / भाषा बदलें', 'Go Back / भाषा बदलें')}
              </button>
            </div>
          </div>
        )}

        {/* 2. PHONE NUMBER INPUT */}
        {intakeMode === 'PHONE' && (
          <div className="card fade-in-up">
            <h2 className="text-heading" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              {translate('Enter Mobile Number', 'मोबाइल नंबर दर्ज करें')}
            </h2>
            <form onSubmit={handlePhoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="text-body text-secondary" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {translate('10-Digit Mobile Number', '१० अंकों का मोबाइल नंबर')}
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isLoading}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPhoneNumber('');
                    setIntakeMode('CHOOSE');
                  }}
                  disabled={isLoading}
                >
                  {translate('Cancel', 'रद्द करें')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? translate('Checking...', 'जांच की जा रही है...') : translate('Send OTP', 'ओटीपी भेजें')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. NEW USER REGISTRATION FORM */}
        {intakeMode === 'REGISTER' && (
          <div className="card fade-in-up">
            <h2 className="text-heading" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
              {translate('Patient Details', 'मरीज की जानकारी')}
            </h2>
            <p className="text-muted text-body" style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {translate(
                'Complete your demographic card to continue.',
                'जारी रखने के लिए मरीज की बुनियादी जानकारी भरें।'
              )}
            </p>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-body text-secondary">{translate('First Name', 'पहला नाम')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <label className="text-body text-secondary">{translate('Last Name', 'उपनाम / सरनेम')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-body text-secondary">{translate('Age', 'उम्र')}</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    max="125"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <label className="text-body text-secondary">{translate('Gender', 'लिंग')}</label>
                  <select
                    className="form-input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    disabled={isLoading}
                    required
                  >
                    <option value="">-- {translate('Select', 'चुनें')} --</option>
                    <option value="MALE">{translate('Male', 'पुरुष')}</option>
                    <option value="FEMALE">{translate('Female', 'महिला')}</option>
                    <option value="OTHER">{translate('Other', 'अन्य')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFirstName('');
                    setLastName('');
                    setAge('');
                    setGender('');
                    setIntakeMode('PHONE');
                  }}
                  disabled={isLoading}
                >
                  {translate('Go Back', 'पीछे जाएं')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? translate('Registering...', 'पंजीकरण हो रहा है...') : translate('Register & Continue', 'पंजीकरण करें')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
