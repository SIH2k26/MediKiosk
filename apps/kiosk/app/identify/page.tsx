'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api-client';

type IntakeMode = 'CHOOSE' | 'PHONE' | 'OTP' | 'ABHA' | 'LOGIN' | 'REGISTER' | 'VERIFY_EMAIL' | 'FORGOT';

export default function IdentifyPage() {
  const router = useRouter();

  const [language, setLanguage]     = useState('hi');
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('CHOOSE');

  // Identification fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [abhaId, setAbhaId]           = useState('');
  const [otpCode, setOtpCode]         = useState('');
  const [devOtpHint, setDevOtpHint]   = useState<string | null>(null);

  // Shared auth fields
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [confirmPw, setConfirmPw]     = useState('');

  // Register demographics
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [age, setAge]                 = useState('');
  const [gender, setGender]           = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');

  // Forgot password & feedback
  const [resetSent, setResetSent]     = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);
  const [isLoading, setIsLoading]     = useState(false);

  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);
    // Clear any lingering auth session so kiosk is fresh
    supabase.auth.signOut().catch(() => {});
  }, []);

  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const clear = () => { setErrorMsg(null); setSuccessMsg(null); };

  // ─── Complete intake: create patient + session → go to consent ─────────────
  const completeIntake = async (patientPayload: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const patient = (patientPayload as any).id
        ? (patientPayload as any)
        : await api.createPatient(patientPayload as any);
      sessionStorage.setItem('mk_patient', JSON.stringify(patient));
      const session = await api.startSession(patient.id, language);
      sessionStorage.setItem('mk_session', JSON.stringify(session));
      router.push('/consent');
    } catch (err: any) {
      setErrorMsg(err.message || t('Intake failed. Please try again.', 'चेक-इन विफल हुआ। कृपया पुनः प्रयास करें।'));
      setIsLoading(false);
    }
  };

  // ─── FLOW 1: Phone + OTP ───────────────────────────────────────────────────
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    if (!/^\d{10}$/.test(phoneNumber)) {
      setErrorMsg(t('Please enter a valid 10-digit mobile number.', 'कृपया सही १० अंकों का मोबाइल नंबर दर्ज करें।'));
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.sendOtp(phoneNumber);
      setDevOtpHint(result.devCode || null);
      setOtpCode('');
      setIntakeMode('OTP');
    } catch (err: any) {
      setErrorMsg(err.message || t('Could not send OTP.', 'ओटीपी नहीं भेजा जा सका।'));
    } finally {
      setIsLoading(false);
    }
  };

  const lookupByPhone = async () => {
    setIsLoading(true);
    clear();
    try {
      const patient = await api.createPatient({
        firstName: t('Walk-in', 'आगंतुक'),
        lastName: t('Patient', 'रोगी'),
        phone: phoneNumber,
        preferredLanguage: language as any,
        isAnonymous: false,
      });

      if (patient.firstName === 'Walk-in' || patient.firstName === 'आगंतुक') {
        setIntakeMode('REGISTER');
        setIsLoading(false);
      } else {
        await completeIntake(patient);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('Verification failed', 'सत्यापन विफल'));
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      setErrorMsg(t('Please enter the 6-digit OTP.', 'कृपया 6 अंकों का ओटीपी दर्ज करें।'));
      return;
    }
    setIsLoading(true);
    clear();
    try {
      await api.verifyOtp(phoneNumber, otpCode);
      await lookupByPhone();
    } catch (err: any) {
      setErrorMsg(err.message || t('OTP verification failed.', 'ओटीपी सत्यापन विफल हुआ।'));
      setIsLoading(false);
    }
  };

  // ─── FLOW 2: ABHA (Ayushman Bharat Health Account) ──────────────────────────
  const handleAbhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = abhaId.replace(/[\s-]/g, '');
    if (!/^\d{14}$/.test(cleaned)) {
      setErrorMsg(t('Please enter a valid 14-digit ABHA number.', 'कृपया सही 14-अंकीय ABHA नंबर दर्ज करें।'));
      return;
    }
    setIsLoading(true);
    clear();
    try {
      const patient = await api.createPatient({
        firstName: 'ABHA',
        lastName: 'Patient',
        abhaId: cleaned,
        preferredLanguage: language as any,
        isAnonymous: false,
      });

      if (patient.firstName === 'ABHA') {
        setIntakeMode('REGISTER');
        setIsLoading(false);
      } else {
        await completeIntake(patient);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('ABHA lookup failed.', 'ABHA खोज विफल।'));
      setIsLoading(false);
    }
  };

  // ─── FLOW 3: Login with Email & Password ────────────────────────────────────
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

  // ─── FLOW 4: New Patient Registration ──────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();

    if (!firstName.trim() || !lastName.trim() || !age || !gender) {
      setErrorMsg(t('Please fill in all required demographic fields.', 'कृपया सभी अनिवार्य जानकारी भरें।'));
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) {
      setErrorMsg(t('Please enter a valid age.', 'कृपया सही उम्र दर्ज करें।'));
      return;
    }

    if (password && password !== confirmPw) {
      setErrorMsg(t('Passwords do not match.', 'पासवर्ड मेल नहीं खाते।'));
      return;
    }

    setIsLoading(true);
    try {
      const cleanedAbha = abhaId.replace(/[\s-]/g, '');
      const patientPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: ageNum,
        gender: gender as any,
        email: email.trim() || undefined,
        phone: phoneNumber || undefined,
        abhaId: cleanedAbha || undefined,
        preferredLanguage: language as any,
        isAnonymous: false,
      };

      if (email && password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
          },
        });
        if (error) throw error;

        if (data.session) {
          await completeIntake(patientPayload);
        } else {
          setPendingEmail(email);
          sessionStorage.setItem('mk_pending_registration', JSON.stringify(patientPayload));
          setIntakeMode('VERIFY_EMAIL');
          setIsLoading(false);
        }
      } else {
        await completeIntake(patientPayload);
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('already registered')) {
        setErrorMsg(t('This email is already registered. Please log in instead.', 'यह ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें।'));
      } else {
        setErrorMsg(err.message || t('Registration failed. Please try again.', 'पंजीकरण विफल। पुनः प्रयास करें।'));
      }
      setIsLoading(false);
    }
  };

  // ─── FLOW 5: Anonymous Walk-in ──────────────────────────────────────────────
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
      setErrorMsg(err.message || t('Failed to start walk-in intake.', 'आगंतुक चेक-इन शुरू नहीं हो सका।'));
      setIsLoading(false);
    }
  };

  // ─── FLOW 6: Forgot Password ────────────────────────────────────────────────
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

  return (
    <main className="kiosk-screen">
      <Header />
      <div className="kiosk-container" style={{ paddingTop: '100px', maxWidth: '820px' }}>
        {errorMsg && (
          <div className="alert alert-error" role="alert" aria-live="assertive" style={{ marginBottom: '1.5rem' }}>
            <span aria-hidden="true">⚠️</span> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" role="status" style={{ marginBottom: '1.5rem' }}>
            <span aria-hidden="true">✓</span> {successMsg}
          </div>
        )}

        {/* ── 1. CHOOSE ────────────────────────────────────────────────────────── */}
        {intakeMode === 'CHOOSE' && (
          <div style={{ textAlign: 'center' }}>
            <div className="fade-in-up" style={{ marginBottom: '2rem' }}>
              <h1 className="text-display" style={{ marginBottom: '0.75rem' }}>
                {t('How would you like to check in?', 'आप किस तरह चेक-इन करना चाहते हैं?')}
              </h1>
              <p className="text-body text-secondary">
                {t('Choose an identification method to begin your consultation.', 'परामर्श शुरू करने के लिए कोई एक विकल्प चुनें।')}
              </p>
            </div>

            <div
              className="fade-in-up fade-in-up-delay-1"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              {/* Phone + OTP */}
              <button className="choose-card choose-card-highlight" onClick={() => { clear(); setIntakeMode('PHONE'); }}>
                <span className="choose-card-icon">📱</span>
                <span className="choose-card-title">{t('Mobile & OTP', 'मोबाइल और ओटीपी')}</span>
                <span className="choose-card-sub">{t('Fast check-in via SMS code', 'एसएमएस कोड द्वारा त्वरित प्रवेश')}</span>
                <span className="choose-card-badge">{t('Popular', 'लोकप्रिय')}</span>
              </button>

              {/* ABHA Number */}
              <button className="choose-card" onClick={() => { clear(); setIntakeMode('ABHA'); }}>
                <span className="choose-card-icon">🆔</span>
                <span className="choose-card-title">{t('ABHA Health ID', 'ABHA हेल्थ आईडी')}</span>
                <span className="choose-card-sub">{t('14-digit Ayushman Bharat ID', '14-अंकीय आयुष्मान भारत खाता')}</span>
              </button>

              {/* Account Login */}
              <button className="choose-card" onClick={() => { clear(); setIntakeMode('LOGIN'); }}>
                <span className="choose-card-icon">🔐</span>
                <span className="choose-card-title">{t('Registered Account', 'पंजीकृत खाता')}</span>
                <span className="choose-card-sub">{t('Sign in with email & password', 'ईमेल और पासवर्ड से लॉगिन करें')}</span>
              </button>

              {/* Quick Walk-in */}
              <button className="choose-card" onClick={handleAnonymous} disabled={isLoading}>
                <span className="choose-card-icon">🚶</span>
                <span className="choose-card-title">{t('Quick Walk-in', 'त्वरित आगंतुक')}</span>
                <span className="choose-card-sub">{t('Continue without registration', 'बिना पंजीकरण सीधे प्रवेश करें')}</span>
              </button>
            </div>

            <div className="fade-in-up fade-in-up-delay-2">
              <a href="/start" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                ← {t('Go back / Change language', 'वापस जाएं / भाषा बदलें')}
              </a>
            </div>
          </div>
        )}

        {/* ── 2. PHONE NUMBER INPUT ────────────────────────────────────────────── */}
        {intakeMode === 'PHONE' && (
          <div className="auth-card fade-in-up">
            <div className="auth-card-header">
              <h1 className="auth-card-title">{t('Enter Mobile Number', 'मोबाइल नंबर दर्ज करें')}</h1>
              <p className="auth-card-sub">{t('We will send a 6-digit verification code.', 'हम ६ अंकों का सत्यापन कोड भेजेंगे।')}</p>
            </div>
            <form onSubmit={handlePhoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-field">
                <label className="form-label">{t('10-Digit Mobile Number', '१० अंकों का मोबाइल नंबर')}</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={goBack} disabled={isLoading}>
                  {t('Back', 'वापस')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? t('Sending…', 'भेजा जा रहा है…') : t('Send OTP →', 'ओटीपी भेजें →')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── 3. OTP VERIFICATION ──────────────────────────────────────────────── */}
        {intakeMode === 'OTP' && (
          <div className="auth-card fade-in-up">
            <div className="auth-card-header">
              <h1 className="auth-card-title">{t('Verify OTP', 'ओटीपी सत्यापित करें')}</h1>
              <p className="auth-card-sub">{t(`Code sent to +91 ${phoneNumber}`, `+91 ${phoneNumber} पर कोड भेजा गया है`)}</p>
            </div>

            {devOtpHint && (
              <div style={{ background: 'rgba(26,115,232,0.12)', border: '1px dashed var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
                🧪 {t('Dev mode OTP is:', 'डेव मोड ओटीपी:')} <strong>{devOtpHint}</strong>
              </div>
            )}

            <form onSubmit={handleOtpVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <input
                type="tel"
                className="form-input"
                style={{ fontSize: '1.75rem', textAlign: 'center', letterSpacing: '0.5rem', fontWeight: 700 }}
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isLoading}
                autoFocus
                required
              />
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setIntakeMode('PHONE')} disabled={isLoading}>
                  {t('Change Number', 'नंबर बदलें')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? t('Verifying…', 'सत्यापित हो रहा है…') : t('Verify & Continue →', 'सत्यापित करें →')}
                </button>
              </div>
              <button type="button" className="link-btn" onClick={lookupByPhone} disabled={isLoading} style={{ textAlign: 'center' }}>
                {t('Skip verification and continue as guest →', 'सत्यापन छोड़ें और आगे बढ़ें →')}
              </button>
            </form>
          </div>
        )}

        {/* ── 4. ABHA INPUT ────────────────────────────────────────────────────── */}
        {intakeMode === 'ABHA' && (
          <div className="auth-card fade-in-up">
            <div className="auth-card-header">
              <h1 className="auth-card-title">{t('Enter ABHA ID', 'ABHA आईडी दर्ज करें')}</h1>
              <p className="auth-card-sub">{t('14-digit Ayushman Bharat Health Account number', '14-अंकीय आयुष्मान भारत हेल्थ अकाउंट नंबर')}</p>
            </div>
            <form onSubmit={handleAbhaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-field">
                <label className="form-label">{t('ABHA Number', 'ABHA नंबर')}</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.15rem' }}
                  placeholder="12-3456-7890-1234"
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={goBack} disabled={isLoading}>
                  {t('Back', 'वापस')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? t('Checking…', 'जांच जारी…') : t('Lookup ABHA →', 'ABHA खोजें →')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── 5. LOGIN ─────────────────────────────────────────────────────────── */}
        {intakeMode === 'LOGIN' && (
          <div className="auth-card fade-in-up">
            <div className="auth-card-header">
              <h1 className="auth-card-title">{t('Sign In to MediKiosk', 'MediKiosk में साइन इन करें')}</h1>
              <p className="auth-card-sub">{t('Use the email and password you registered with.', 'अपने पंजीकृत ईमेल और पासवर्ड का उपयोग करें।')}</p>
            </div>
            <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-field">
                <label className="form-label">{t('Email Address', 'ईमेल एड्रेस')}</label>
                <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
              </div>
              <div className="form-field">
                <label className="form-label">{t('Password', 'पासवर्ड')}</label>
                <div className="input-group">
                  <input type={showPw ? 'text' : 'password'} className="form-input input-with-btn" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required />
                  <button type="button" className="input-inline-btn" onClick={() => setShowPw(v => !v)}>
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
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? t('Signing in…', 'साइन इन हो रहा है…') : t('Sign In →', 'साइन इन करें →')}
                </button>
              </div>
            </form>
            <div className="auth-card-footer">
              {t("Don't have an account?", 'खाता नहीं है?')}{' '}
              <button className="link-btn" onClick={() => { clear(); setIntakeMode('REGISTER'); }}>
                {t('Register here', 'यहाँ पंजीकरण करें')}
              </button>
            </div>
          </div>
        )}

        {/* ── 6. REGISTER ──────────────────────────────────────────────────────── */}
        {intakeMode === 'REGISTER' && (
          <div className="auth-card fade-in-up" style={{ maxWidth: '680px' }}>
            <div className="auth-card-header">
              <h1 className="auth-card-title">{t('Patient Details', 'मरीज की जानकारी')}</h1>
              <p className="auth-card-sub">{t('Complete your demographic card to continue.', 'जारी रखने के लिए मरीज की बुनियादी जानकारी भरें।')}</p>
            </div>
            <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">{t('First Name', 'पहला नाम')} <span className="required-star">*</span></label>
                  <input type="text" className="form-input" placeholder={t('e.g. Ramesh', 'जैसे रमेश')} value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isLoading} required />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('Last Name', 'उपनाम')} <span className="required-star">*</span></label>
                  <input type="text" className="form-input" placeholder={t('e.g. Gupta', 'जैसे गुप्ता')} value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} required />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">{t('Age', 'उम्र')} <span className="required-star">*</span></label>
                  <input type="number" className="form-input" placeholder="25" min="0" max="125" value={age} onChange={(e) => setAge(e.target.value)} disabled={isLoading} required />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('Gender', 'लिंग')} <span className="required-star">*</span></label>
                  <select className="form-input" value={gender} onChange={(e) => setGender(e.target.value as any)} disabled={isLoading} required>
                    <option value="">— {t('Select', 'चुनें')} —</option>
                    <option value="MALE">{t('Male', 'पुरुष')}</option>
                    <option value="FEMALE">{t('Female', 'महिला')}</option>
                    <option value="OTHER">{t('Other / Prefer not to say', 'अन्य')}</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="form-label">{t('Mobile Number', 'मोबाइल नंबर')}</label>
                  <input type="tel" className="form-input" placeholder="9876543210" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={isLoading} />
                </div>
                <div className="form-field">
                  <label className="form-label">{t('ABHA Number', 'ABHA नंबर')}</label>
                  <input type="text" className="form-input" placeholder="12345678901234" value={abhaId} onChange={(e) => setAbhaId(e.target.value)} disabled={isLoading} />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">{t('Email Address (Optional)', 'ईमेल एड्रेस (वैकल्पिक)')}</label>
                <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
              </div>

              <div className="btn-row" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={goBack} disabled={isLoading}>
                  {t('Back', 'वापस')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? t('Saving…', 'सहेजा जा रहा है…') : t('Save & Continue →', 'सहेजें और आगे बढ़ें →')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── 7. FORGOT PASSWORD ───────────────────────────────────────────────── */}
        {intakeMode === 'FORGOT' && (
          <div className="auth-card fade-in-up">
            {resetSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
                <h1 className="auth-card-title">{t('Reset link sent!', 'रीसेट लिंक भेजा गया!')}</h1>
                <p className="auth-card-sub" style={{ marginBottom: '1.5rem' }}>
                  {t(`Check ${email} for password reset instructions.`, `${email} पर पासवर्ड रीसेट लिंक देखें।`)}
                </p>
                <button className="btn btn-primary" onClick={() => { setResetSent(false); setIntakeMode('LOGIN'); }}>
                  {t('Back to Sign In', 'साइन इन पर वापस जाएं')}
                </button>
              </div>
            ) : (
              <>
                <div className="auth-card-header">
                  <h1 className="auth-card-title">{t('Forgot Password', 'पासवर्ड भूल गए')}</h1>
                  <p className="auth-card-sub">{t('Enter your email to receive a reset link.', 'रीसेट लिंक प्राप्त करने के लिए अपना ईमेल दर्ज करें।')}</p>
                </div>
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-field">
                    <label className="form-label">{t('Email Address', 'ईमेल एड्रेस')}</label>
                    <input type="email" className="form-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
                  </div>
                  <div className="btn-row">
                    <button type="button" className="btn btn-secondary" onClick={() => setIntakeMode('LOGIN')} disabled={isLoading}>
                      {t('Back', 'वापस')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                      {isLoading ? t('Sending…', 'भेजा जा रहा है…') : t('Send Reset Link →', 'रीसेट लिंक भेजें →')}
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
