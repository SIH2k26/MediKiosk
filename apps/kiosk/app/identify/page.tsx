'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api-client';

export default function IdentifyPage() {
  const router = useRouter();

  // Language state
  const [language, setLanguage] = useState('hi');

  // Intake UI mode
  const [intakeMode, setIntakeMode] = useState<'CHOOSE' | 'LOGIN' | 'REGISTER' | 'OTP'>('CHOOSE');

  // Forms state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Demographics state (for Sign Up / Register)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Verification & loading states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);

    // If a session already exists on kiosk, clear it to avoid cross-profile leakage
    supabase.auth.signOut().catch(() => {});
  }, []);

  const translate = (en: string, hi: string) => {
    return language === 'hi' ? hi : en;
  };

  // Helper: complete intake session start
  const handleProceed = async (patientPayload: any) => {
    try {
      // Step 1: Create or fetch patient record (Express API automatically reads JWT token via auth headers)
      const patient = await api.createPatient(patientPayload);
      sessionStorage.setItem('mk_patient', JSON.stringify(patient));

      // Step 2: Initialize Kiosk Session
      const session = await api.startSession(patient.id, language);
      sessionStorage.setItem('mk_session', JSON.stringify(session));

      // Step 3: Proceed to Consent
      router.push('/consent');
    } catch (err: any) {
      setErrorMsg(err.message || 'Intake session creation failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Flow 1: Email + Password Sign In (Existing Patient)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg(translate('Email and Password are required.', 'ईमेल और पासवर्ड भरना अनिवार्य है।'));
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Authentication failed');

      // Request API lookup to fetch clinical patient record (links automatically via auth token)
      const patientPayload = {
        firstName: translate('Walk-in', 'आगंतुक'),
        lastName: 'Patient',
        email: email,
        preferredLanguage: language as any,
        isAnonymous: false,
      };

      await handleProceed(patientPayload);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  // Flow 2: Email + Password Sign Up (New Patient Registration)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName || !age || !gender) {
      setErrorMsg(translate('All fields are required.', 'सभी जानकारी भरना अनिवार्य है।'));
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Sign up in Supabase Auth (automatically triggers Email Verification OTP code)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Registration failed');

      // Transition to OTP Code input screen
      setIntakeMode('OTP');
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Try a different email.');
      setIsLoading(false);
    }
  };

  // Flow 3: Verify 6-digit OTP verification code from Email
  const handleOtpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMsg(translate('Please enter the 6-digit verification code.', 'कृपया ६ अंकों का ओटीपी कोड दर्ज करें।'));
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Verify OTP in Supabase Auth
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });

      if (error) throw error;
      if (!data.user) throw new Error('Verification failed');

      // OTP Verification Success -> Create Patient Record and session
      const patientPayload = {
        firstName,
        lastName,
        age: parseInt(age, 10),
        gender: gender as any,
        email,
        phone: phoneNumber || undefined,
        preferredLanguage: language as any,
        isAnonymous: false,
      };

      await handleProceed(patientPayload);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid code. Please check your email.');
      setIsLoading(false);
    }
  };

  // Flow 4: Anonymous Direct Check-in
  const handleAnonymousCheckIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);

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
        {/* Error Notification */}
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
                  'Select your preferred check-in method for consultation.',
                  'परामर्श के लिए अपनी पसंदीदा चेक-इन विधि का चयन करें।'
                )}
              </p>
            </div>

            <div
              className="fade-in-up fade-in-up-delay-1"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}
            >
              {/* Login */}
              <button
                className="lang-card"
                onClick={() => setIntakeMode('LOGIN')}
                style={{ minHeight: '180px' }}
              >
                <span style={{ fontSize: '3rem' }}>🔐</span>
                <span className="lang-card-name">
                  {translate('Log In', 'लॉगिन करें')}
                </span>
                <span className="lang-card-native" style={{ fontSize: '0.9rem' }}>
                  {translate('Existing Account', 'पहले से खाता है')}
                </span>
              </button>

              {/* Sign Up */}
              <button
                className="lang-card"
                onClick={() => setIntakeMode('REGISTER')}
                style={{ minHeight: '180px' }}
              >
                <span style={{ fontSize: '3rem' }}>📝</span>
                <span className="lang-card-name">
                  {translate('Register (Sign Up)', 'नया खाता बनाएं')}
                </span>
                <span className="lang-card-native" style={{ fontSize: '0.9rem' }}>
                  {translate('Saves profile with Email OTP', 'ईमेल सत्यापन के साथ सुरक्षित')}
                </span>
              </button>

              {/* Walk-in */}
              <button
                className="lang-card"
                onClick={handleAnonymousCheckIn}
                disabled={isLoading}
                style={{ minHeight: '180px' }}
              >
                <span style={{ fontSize: '3rem' }}>🚶‍♂️</span>
                <span className="lang-card-name">
                  {translate('Walk-in (Anonymous)', 'त्वरित आगंतुक')}
                </span>
                <span className="lang-card-native" style={{ fontSize: '0.9rem' }}>
                  {translate('Skip registration', 'बिना पंजीकरण सीधे')}
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

        {/* 2. SIGN IN / LOGIN VIEW */}
        {intakeMode === 'LOGIN' && (
          <div className="card fade-in-up">
            <h2 className="text-heading" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              {translate('Log In to MediKiosk', 'मेडिकियॉस्क में लॉगिन करें')}
            </h2>
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="text-body text-secondary">{translate('Email Address', 'ईमेल एड्रेस')}</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="text-body text-secondary">{translate('Password', 'पासवर्ड')}</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEmail('');
                    setPassword('');
                    setIntakeMode('CHOOSE');
                  }}
                  disabled={isLoading}
                >
                  {translate('Cancel', 'रद्द करें')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? translate('Logging In...', 'लॉगिन हो रहा है...') : translate('Log In', 'लॉगिन करें')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. SIGN UP / REGISTRATION VIEW */}
        {intakeMode === 'REGISTER' && (
          <div className="card fade-in-up" style={{ maxWidth: '650px' }}>
            <h2 className="text-heading" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
              {translate('Register Patient Account', 'मरीज का पंजीकरण करें')}
            </h2>
            <p className="text-muted text-body" style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {translate(
                'Complete details. An Email verification code (OTP) will be sent.',
                'जानकारी भरें। आपके ईमेल पर एक ओटीपी कोड भेजा जाएगा।'
              )}
            </p>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-body text-secondary">{translate('Email', 'ईमेल एड्रेस')}</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <label className="text-body text-secondary">{translate('Password', 'पासवर्ड')}</label>
                  <input
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

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

              <div>
                <label className="text-body text-secondary">{translate('Mobile Number (Optional)', 'मोबाइल नंबर (वैकल्पिक)')}</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isLoading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIntakeMode('CHOOSE')}
                  disabled={isLoading}
                >
                  {translate('Go Back', 'पीछे जाएं')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {translate('Register & Send OTP', 'पंजीकरण करें')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 4. OTP VERIFICATION CODE VIEW */}
        {intakeMode === 'OTP' && (
          <div className="card fade-in-up">
            <h2 className="text-heading" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
              {translate('Verify Registration', 'पंजीकरण सत्यापित करें')}
            </h2>
            <p className="text-muted text-body" style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {translate(
                `Enter the 6-digit confirmation code sent to ${email}`,
                `आपके ईमेल ${email} पर भेजा गया ६ अंकों का कोड दर्ज करें`
              )}
            </p>

            <form onSubmit={handleOtpVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="text-body text-secondary" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {translate('6-Digit Code (OTP)', '६ अंकों का कोड (ओटीपी)')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="e.g. 123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  required
                  style={{ textAlign: 'center', letterSpacing: '0.75rem', fontSize: '1.5rem', fontWeight: 'bold' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setOtpCode('');
                    setIntakeMode('REGISTER');
                  }}
                  disabled={isLoading}
                >
                  {translate('Go Back', 'पीछे जाएं')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? translate('Verifying...', 'जांच हो रही है...') : translate('Verify & Continue', 'सत्यापित करें')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
