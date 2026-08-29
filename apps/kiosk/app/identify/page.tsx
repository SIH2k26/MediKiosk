'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api-client';

type IntakeMode = 'CHOOSE' | 'LOGIN' | 'REGISTER' | 'VERIFY_EMAIL' | 'FORGOT';

export default function IdentifyPage() {
  const router = useRouter();

  const [language, setLanguage]     = useState('hi');
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('CHOOSE');

  // Shared auth fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  // Register-only fields
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [age, setAge]               = useState('');
  const [gender, setGender]         = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmPw, setConfirmPw]   = useState('');

  // Forgot password
  const [resetSent, setResetSent]   = useState(false);

  // UI state
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);
    // Clear any lingering session so kiosk is always fresh
    supabase.auth.signOut().catch(() => {});
  }, []);

  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const clear = () => { setErrorMsg(null); setSuccessMsg(null); };

  // ─── Complete intake: create patient + session → go to consent ─────────────
  const completeIntake = async (patientPayload: Record<string, unknown>) => {
    const patient = await api.createPatient(patientPayload as any);
    sessionStorage.setItem('mk_patient', JSON.stringify(patient));
    const session = await api.startSession(patient.id, language);
    sessionStorage.setItem('mk_session', JSON.stringify(session));
    router.push('/consent');
  };

  // ─── FLOW 1: Login (existing patient) ──────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    if (!email || !password) {
      setErrorMsg(t('Please fill in your email and password.', 'कृपया ईमेल और पासवर्ड भरें।'));
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Give a friendly message for the common "Email not confirmed" case
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMsg(t(
            'Your email is not verified yet. Check your inbox for a verification link, or register again to resend it.',
            'आपका ईमेल अभी सत्यापित नहीं हुआ। अपना इनबॉक्स देखें या दोबारा पंजीकरण करें।'
          ));
        } else {
          throw error;
        }
        setIsLoading(false);
        return;
      }
      if (!data.user) throw new Error('Authentication failed');

      await completeIntake({
        email,
        preferredLanguage: language,
        isAnonymous: false,
        firstName: t('Returning', 'वापसी'),
        lastName: t('Patient', 'रोगी'),
      });
    } catch (err: any) {
      setErrorMsg(err.message || t('Login failed. Please check your credentials.', 'लॉगिन विफल। कृपया जानकारी जांचें।'));
      setIsLoading(false);
    }
  };

  // ─── FLOW 2: Register (new patient) ─────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();

    if (!firstName.trim() || !lastName.trim() || !age || !gender || !email || !password) {
      setErrorMsg(t('Please fill in all required fields.', 'कृपया सभी अनिवार्य जानकारी भरें।'));
      return;
    }
    if (password !== confirmPw) {
      setErrorMsg(t('Passwords do not match.', 'पासवर्ड मेल नहीं खाते।'));
      return;
    }
    if (password.length < 8) {
      setErrorMsg(t('Password must be at least 8 characters.', 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए।'));
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) {
      setErrorMsg(t('Please enter a valid age.', 'कृपया सही उम्र दर्ज करें।'));
      return;
    }

    setIsLoading(true);
    try {
      // Sign up — Supabase will send a confirmation email (link, not code)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Redirect after email confirmation — handled by /auth/callback
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // Supabase may return a session immediately (if "Confirm email" is disabled)
      // or return null session (email confirmation required). Either way we proceed.
      const patientPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: ageNum,
        gender: gender as any,
        email,
        phone: phoneNumber || undefined,
        preferredLanguage: language as any,
        isAnonymous: false,
      };

      if (data.session) {
        // Email confirmation disabled — proceed immediately
        await completeIntake(patientPayload);
      } else {
        // Email confirmation required — create patient record immediately anyway
        // (they can verify later; their account is created)
        // We use anonymous session for the intake since they can't confirm mid-kiosk
        setPendingEmail(email);
        // Store registration data so we can create patient after
        sessionStorage.setItem('mk_pending_registration', JSON.stringify(patientPayload));
        setIntakeMode('VERIFY_EMAIL');
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('already registered')) {
        setErrorMsg(t(
          'This email is already registered. Please log in instead.',
          'यह ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें।'
        ));
      } else {
        setErrorMsg(err.message || t('Registration failed. Please try again.', 'पंजीकरण विफल। पुनः प्रयास करें।'));
      }
      setIsLoading(false);
    }
  };

  // ─── FLOW 3: Proceed as walk-in from verify-email screen ───────────────────
  const handleProceedAsAnonymous = async () => {
    setIsLoading(true);
    clear();
    try {
      const stored = sessionStorage.getItem('mk_pending_registration');
      const payload = stored ? JSON.parse(stored) : {
        firstName: t('Walk-in', 'आगंतुक'),
        lastName: t('Patient', 'रोगी'),
        preferredLanguage: language,
        isAnonymous: true,
      };
      // Proceed with intake (email not yet verified — that's OK)
      await completeIntake({ ...payload, isAnonymous: false });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to proceed. Please try again.');
      setIsLoading(false);
    }
  };

  // ─── FLOW 4: Anonymous walk-in ─────────────────────────────────────────────
  const handleAnonymous = async () => {
    setIsLoading(true);
    clear();
    try {
      await completeIntake({
        firstName: t('Walk-in', 'आगंतुक'),
        lastName: t('Patient', 'रोगी'),
        preferredLanguage: language,
        isAnonymous: true,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed. Please try again.');
      setIsLoading(false);
    }
  };

  // ─── FLOW 5: Forgot password ───────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    if (!email) {
      setErrorMsg(t('Enter your registered email address.', 'अपना पंजीकृत ईमेल दर्ज करें।'));
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const goBack = () => {
    clear();
    setIntakeMode('CHOOSE');
  };

  const Header = () => (
    <header className="kiosk-header">
      <div className="logo">
        <div className="logo-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 4L24 10V18L14 24L4 18V10L14 4Z" stroke="white" strokeWidth="1.5" fill="none" />
            <path d="M14 11V17M11 14H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div className="logo-text">MediKiosk</div>
          <div className="logo-tagline">AI Clinical Intake</div>
        </div>
      </div>
      <div className="step-indicator" aria-label="Step 2 of 5">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`step-dot ${s === 2 ? 'active' : s < 2 ? 'completed' : ''}`} aria-hidden="true" />
        ))}
      </div>
    </header>
  );

  const ErrorBanner = () => errorMsg ? (
    <div className="alert alert-error" role="alert" aria-live="assertive">
      <span aria-hidden="true">⚠</span> {errorMsg}
    </div>
  ) : null;

  const SuccessBanner = () => successMsg ? (
    <div className="alert alert-success" role="status">
      <span aria-hidden="true">✓</span> {successMsg}
    </div>
  ) : null;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <main className="kiosk-screen">
      <Header />
      <div className="kiosk-container" style={{ paddingTop: '100px' }}>
        <ErrorBanner />
        <SuccessBanner />

        {/* ── 1. CHOOSE ─────────────────────────────────────── */}
        {intakeMode === 'CHOOSE' && (
          <div style={{ textAlign: 'center' }}>
            <div className="fade-in-up" style={{ marginBottom: '2.5rem' }}>
              <h1 className="text-display" style={{ marginBottom: '0.875rem' }}>
                {t('How would you like to check in?', 'आप किस तरह चेक-इन करना चाहते हैं?')}
              </h1>
              <p className="text-body text-secondary">
                {t('Select the option that applies to you.', 'अपनी स्थिति के अनुसार विकल्प चुनें।')}
              </p>
            </div>

            <div className="fade-in-up fade-in-up-delay-1 choose-grid">
              {/* Returning patient */}
              <button className="choose-card" onClick={() => { clear(); setIntakeMode('LOGIN'); }} id="choose-login-btn">
                <span className="choose-card-icon">🔐</span>
                <span className="choose-card-title">{t('I have an account', 'मेरा खाता है')}</span>
                <span className="choose-card-sub">{t('Sign in with email & password', 'ईमेल और पासवर्ड से लॉगिन करें')}</span>
              </button>

              {/* New patient */}
              <button className="choose-card choose-card-highlight" onClick={() => { clear(); setIntakeMode('REGISTER'); }} id="choose-register-btn">
                <span className="choose-card-icon">📝</span>
                <span className="choose-card-title">{t('First time here', 'पहली बार आए हैं')}</span>
                <span className="choose-card-sub">{t('Create a free patient account', 'मुफ्त रोगी खाता बनाएं')}</span>
                <span className="choose-card-badge">{t('Recommended', 'सुझाया गया')}</span>
              </button>

              {/* Walk-in anonymous */}
              <button className="choose-card" onClick={handleAnonymous} disabled={isLoading} id="choose-walkin-btn">
                <span className="choose-card-icon">🚶</span>
                <span className="choose-card-title">{t('Continue without account', 'बिना खाते के जारी रखें')}</span>
                <span className="choose-card-sub">{t('Quick walk-in — no registration', 'तुरंत आगंतुक — पंजीकरण नहीं')}</span>
              </button>
            </div>

            <div className="fade-in-up fade-in-up-delay-2" style={{ marginTop: '1.5rem' }}>
              <a href="/start" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                ← {t('Go back / Change language', 'वापस जाएं / भाषा बदलें')}
              </a>
            </div>
          </div>
        )}

        {/* ── 2. LOGIN ──────────────────────────────────────── */}
        {intakeMode === 'LOGIN' && (
          <div className="auth-card fade-in-up">
            <div className="auth-card-header">
              <h1 className="auth-card-title">
                {t('Sign In to MediKiosk', 'MediKiosk में साइन इन करें')}
              </h1>
              <p className="auth-card-sub">
                {t('Use the email and password you registered with.', 'अपने पंजीकृत ईमेल और पासवर्ड का उपयोग करें।')}
              </p>
            </div>

            <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-field">
                <label className="form-label" htmlFor="login-email">{t('Email Address', 'ईमेल एड्रेस')}</label>
                <input id="login-email" type="email" className="form-input" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} autoComplete="email" required />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="login-password">{t('Password', 'पासवर्ड')}</label>
                <div className="input-group">
                  <input id="login-password" type={showPw ? 'text' : 'password'} className="form-input input-with-btn"
                    placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading} autoComplete="current-password" required />
                  <button type="button" className="input-inline-btn" onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button type="button" className="link-btn" onClick={() => { clear(); setIntakeMode('FORGOT'); }}>
                {t('Forgot your password?', 'पासवर्ड भूल गए?')}
              </button>

              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={goBack} disabled={isLoading}>
                  {t('Back', 'वापस')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading} id="login-submit-btn">
                  {isLoading ? <><span className="spinner" />  {t('Signing in…', 'साइन इन हो रहा है…')}</> : t('Sign In →', 'साइन इन करें →')}
                </button>
              </div>
            </form>

            <div className="auth-card-footer">
              {t('Don\'t have an account?', 'खाता नहीं है?')}{' '}
              <button className="link-btn" onClick={() => { clear(); setIntakeMode('REGISTER'); }}>
                {t('Register here', 'यहाँ पंजीकरण करें')}
              </button>
            </div>
          </div>
        )}

        {/* ── 3. REGISTER ───────────────────────────────────── */}
        {intakeMode === 'REGISTER' && (
          <div className="auth-card fade-in-up" style={{ maxWidth: '680px' }}>
            <div className="auth-card-header">
              <h1 className="auth-card-title">
                {t('Create Your Patient Account', 'अपना रोगी खाता बनाएं')}
              </h1>
              <p className="auth-card-sub">
                {t(
                  'Your account saves your medical history for future visits. No OTP needed — just fill in the form below.',
                  'आपका खाता भविष्य के दौरों के लिए आपका चिकित्सा इतिहास सुरक्षित रखता है।'
                )}
              </p>
            </div>

            <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Name row */}
              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label" htmlFor="reg-fname">
                    {t('First Name', 'पहला नाम')} <span className="required-star">*</span>
                  </label>
                  <input id="reg-fname" type="text" className="form-input" placeholder={t('e.g. Ramesh', 'जैसे रमेश')}
                    value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isLoading} required />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="reg-lname">
                    {t('Last Name', 'उपनाम')} <span className="required-star">*</span>
                  </label>
                  <input id="reg-lname" type="text" className="form-input" placeholder={t('e.g. Gupta', 'जैसे गुप्ता')}
                    value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} required />
                </div>
              </div>

              {/* Age + Gender row */}
              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label" htmlFor="reg-age">
                    {t('Age', 'उम्र')} <span className="required-star">*</span>
                  </label>
                  <input id="reg-age" type="number" className="form-input" placeholder="25" min="0" max="125"
                    value={age} onChange={(e) => setAge(e.target.value)} disabled={isLoading} required />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="reg-gender">
                    {t('Gender', 'लिंग')} <span className="required-star">*</span>
                  </label>
                  <select id="reg-gender" className="form-input" value={gender}
                    onChange={(e) => setGender(e.target.value as any)} disabled={isLoading} required>
                    <option value="">— {t('Select', 'चुनें')} —</option>
                    <option value="MALE">{t('Male', 'पुरुष')}</option>
                    <option value="FEMALE">{t('Female', 'महिला')}</option>
                    <option value="OTHER">{t('Other / Prefer not to say', 'अन्य')}</option>
                  </select>
                </div>
              </div>

              {/* Email */}
              <div className="form-field">
                <label className="form-label" htmlFor="reg-email">
                  {t('Email Address', 'ईमेल एड्रेस')} <span className="required-star">*</span>
                </label>
                <input id="reg-email" type="email" className="form-input" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} autoComplete="email" required />
                <span className="form-hint">{t('Used to log in on your next visit', 'अगली बार लॉगिन के लिए उपयोग होगा')}</span>
              </div>

              {/* Password row */}
              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label" htmlFor="reg-pw">
                    {t('Password', 'पासवर्ड')} <span className="required-star">*</span>
                  </label>
                  <div className="input-group">
                    <input id="reg-pw" type={showPw ? 'text' : 'password'} className="form-input input-with-btn"
                      placeholder={t('Min 8 characters', 'कम से कम 8 अक्षर')}
                      value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required />
                    <button type="button" className="input-inline-btn" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                      aria-label={showPw ? 'Hide password' : 'Show password'}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="reg-cpw">
                    {t('Confirm Password', 'पासवर्ड पुनः दर्ज करें')} <span className="required-star">*</span>
                  </label>
                  <input id="reg-cpw" type={showPw ? 'text' : 'password'} className="form-input"
                    placeholder={t('Repeat password', 'पासवर्ड दोहराएं')}
                    value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} disabled={isLoading} required />
                </div>
              </div>

              {/* Phone — genuinely optional */}
              <div className="form-field">
                <label className="form-label" htmlFor="reg-phone">
                  {t('Mobile Number', 'मोबाइल नंबर')}
                  <span className="optional-tag">{t('optional', 'वैकल्पिक')}</span>
                </label>
                <input id="reg-phone" type="tel" className="form-input" placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isLoading} />
                <span className="form-hint">{t('For appointment reminders only — no OTP will be sent here', 'केवल अपॉइंटमेंट अनुस्मारक के लिए — यहाँ कोई OTP नहीं भेजा जाएगा')}</span>
              </div>

              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={goBack} disabled={isLoading}>
                  {t('Back', 'वापस')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading} id="register-submit-btn">
                  {isLoading
                    ? <><span className="spinner" /> {t('Creating account…', 'खाता बन रहा है…')}</>
                    : t('Create Account & Continue →', 'खाता बनाएं और जारी रखें →')}
                </button>
              </div>
            </form>

            <div className="auth-card-footer">
              {t('Already have an account?', 'पहले से खाता है?')}{' '}
              <button className="link-btn" onClick={() => { clear(); setIntakeMode('LOGIN'); }}>
                {t('Sign in', 'साइन इन करें')}
              </button>
            </div>
          </div>
        )}

        {/* ── 4. VERIFY EMAIL (shown when Supabase requires confirmation) ─── */}
        {intakeMode === 'VERIFY_EMAIL' && (
          <div className="auth-card fade-in-up" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📧</div>
            <h1 className="auth-card-title" style={{ marginBottom: '0.75rem' }}>
              {t('Check your email', 'अपना ईमेल देखें')}
            </h1>
            <p className="auth-card-sub" style={{ marginBottom: '1.5rem' }}>
              {t(
                `We've sent a verification link to ${pendingEmail}. Click it to activate your account.`,
                `हमने ${pendingEmail} पर एक सत्यापन लिंक भेजा है। खाता सक्रिय करने के लिए उस पर क्लिक करें।`
              )}
            </p>

            {/* Info box */}
            <div className="info-box">
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                {t('💡 Don\'t have access to your email right now?', '💡 अभी ईमेल नहीं देख सकते?')}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {t(
                  'That\'s OK — your account is created. You can verify your email later. For today\'s visit, click the button below to continue.',
                  'ठीक है — आपका खाता बन गया है। ईमेल बाद में सत्यापित कर सकते हैं। आज की यात्रा के लिए नीचे दिए बटन पर क्लिक करें।'
                )}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleProceedAsAnonymous}
                disabled={isLoading}
                id="verify-proceed-btn"
              >
                {isLoading
                  ? <><span className="spinner" /> {t('Starting…', 'शुरू हो रहा है…')}</>
                  : t('Continue Today\'s Visit →', 'आज की यात्रा जारी रखें →')}
              </button>
              <button className="btn btn-secondary" onClick={goBack}>
                {t('Go back', 'वापस जाएं')}
              </button>
            </div>
          </div>
        )}

        {/* ── 5. FORGOT PASSWORD ────────────────────────────── */}
        {intakeMode === 'FORGOT' && (
          <div className="auth-card fade-in-up">
            {resetSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
                <h1 className="auth-card-title" style={{ marginBottom: '0.75rem' }}>
                  {t('Reset link sent!', 'रीसेट लिंक भेजा गया!')}
                </h1>
                <p className="auth-card-sub" style={{ marginBottom: '1.5rem' }}>
                  {t(
                    `Check ${email} for a password reset link. It may take a few minutes.`,
                    `${email} पर पासवर्ड रीसेट लिंक देखें। इसमें कुछ मिनट लग सकते हैं।`
                  )}
                </p>
                <button className="btn btn-primary" onClick={() => { setResetSent(false); setIntakeMode('LOGIN'); }}>
                  {t('Back to Sign In', 'साइन इन पर वापस जाएं')}
                </button>
              </div>
            ) : (
              <>
                <div className="auth-card-header">
                  <h1 className="auth-card-title">{t('Forgot Password', 'पासवर्ड भूल गए')}</h1>
                  <p className="auth-card-sub">
                    {t('Enter your registered email and we\'ll send a reset link.', 'अपना पंजीकृत ईमेल दर्ज करें, हम एक रीसेट लिंक भेजेंगे।')}
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-field">
                    <label className="form-label" htmlFor="forgot-email">
                      {t('Registered Email Address', 'पंजीकृत ईमेल एड्रेस')}
                    </label>
                    <input id="forgot-email" type="email" className="form-input" placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
                  </div>
                  <div className="btn-row">
                    <button type="button" className="btn btn-secondary" onClick={() => { clear(); setIntakeMode('LOGIN'); }}>
                      {t('Back', 'वापस')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                      {isLoading
                        ? <><span className="spinner" /> {t('Sending…', 'भेजा जा रहा है…')}</>
                        : t('Send Reset Link →', 'रीसेट लिंक भेजें →')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
