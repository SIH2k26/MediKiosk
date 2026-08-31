'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInDoctor, registerDoctor, getCurrentDoctorUser } from '../../lib/auth';
import './login.css';

export default function DoctorLoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sign In fields
  const [email, setEmail] = useState('dr.sharma@hospital.org');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regOpdRoom, setRegOpdRoom] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Auto-login check
  useEffect(() => {
    getCurrentDoctorUser().then((user) => {
      if (user) {
        router.replace('/');
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your doctor email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signInDoctor(email.trim(), password);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim()) {
      setError('Please enter your full name and email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await registerDoctor({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        specialty: regSpecialty.trim() || 'General Medicine',
        opdRoom: regOpdRoom.trim() || 'OPD Room 1',
        password: regPassword || 'doctor123',
      });
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await signInDoctor(demoEmail, 'password123');
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Sign-in failed.');
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="login-screen">
        <div className="login-spinner" aria-label="Checking session…" />
      </div>
    );
  }

  return (
    <div className="login-screen" role="main">
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />

      <div className="login-card" style={{ maxWidth: '480px', padding: '24px 28px' }}>
        {/* Header Logo */}
        <div className="login-logo" style={{ marginBottom: '16px' }}>
          <div className="login-logo-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L25 9.5V18.5L14 25L3 18.5V9.5L14 3Z" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M14 10V18M10 14H18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="login-logo-name" style={{ fontSize: '17px' }}>MediKiosk</div>
            <div className="login-logo-sub" style={{ fontSize: '11px' }}>Doctor Clinical Cockpit</div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '3px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setError(null); }}
            style={{
              flex: 1,
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: mode === 'LOGIN' ? '#00C9B1' : 'transparent',
              color: mode === 'LOGIN' ? '#06090E' : 'rgba(240, 244, 248, 0.7)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setError(null); }}
            style={{
              flex: 1,
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: mode === 'REGISTER' ? '#00C9B1' : 'transparent',
              color: mode === 'REGISTER' ? '#06090E' : 'rgba(240, 244, 248, 0.7)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            Register as Doctor
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="login-error" role="alert" style={{ padding: '8px 12px', marginBottom: '12px', fontSize: '13px' }}>
            <span className="login-error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* ── 1. SIGN IN FORM ── */}
        {mode === 'LOGIN' && (
          <div>
            {/* Quick 1-Click Demo Profiles */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#00C9B1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                ⚡ Quick Demo Access (1-Click)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('dr.sharma@hospital.org')}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0, 201, 177, 0.08)',
                    border: '1px solid rgba(0, 201, 177, 0.25)',
                    borderRadius: '8px',
                    color: '#F0F4F8',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>👨‍⚕️ Dr. Rajesh Sharma, MD</div>
                    <div style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.6)' }}>Internal Medicine & Cardiology · OPD Room 4</div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#00C9B1', fontWeight: 700 }}>Enter →</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('dr.priya@hospital.org')}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#F0F4F8',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>👩‍⚕️ Dr. Priya Nair, MS</div>
                    <div style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.6)' }}>Emergency & Triage Specialist · Cockpit 1</div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#00C9B1', fontWeight: 700 }}>Enter →</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '11px', color: 'rgba(240,244,248,0.4)', textTransform: 'uppercase' }}>Or Custom Sign-In</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </div>

            <form onSubmit={handleLogin} noValidate>
              <div className="login-field" style={{ marginBottom: '10px' }}>
                <label htmlFor="doctor-email" className="login-label">Doctor Email</label>
                <input
                  id="doctor-email"
                  type="email"
                  className="login-input"
                  placeholder="doctor@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  style={{ height: '38px', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div className="login-field" style={{ marginBottom: '14px' }}>
                <label htmlFor="doctor-password" className="login-label">Password</label>
                <div className="login-input-group">
                  <input
                    id="doctor-password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-input login-input-pw"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    style={{ height: '38px', fontSize: '13.5px' }}
                    required
                  />
                  <button
                    type="button"
                    className="login-pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={isLoading}
                style={{ height: '42px', backgroundColor: '#00C9B1', color: '#06090E', fontWeight: 700 }}
              >
                {isLoading ? 'Signing in…' : 'Sign In to OPD Queue →'}
              </button>
            </form>
          </div>
        )}

        {/* ── 2. REGISTER AS DOCTOR FORM ── */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="login-field" style={{ marginBottom: 0 }}>
              <label className="login-label">Doctor Full Name *</label>
              <input
                type="text"
                className="login-input"
                placeholder="e.g. Dr. Rajesh Sharma, MD"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                disabled={isLoading}
                style={{ height: '38px', fontSize: '13.5px' }}
                required
              />
            </div>

            <div className="login-field" style={{ marginBottom: 0 }}>
              <label className="login-label">Hospital Email Address *</label>
              <input
                type="email"
                className="login-input"
                placeholder="doctor@hospital.org"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={isLoading}
                style={{ height: '38px', fontSize: '13.5px' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="login-field" style={{ marginBottom: 0 }}>
                <label className="login-label">Specialty / Dept</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. Cardiology"
                  value={regSpecialty}
                  onChange={(e) => setRegSpecialty(e.target.value)}
                  disabled={isLoading}
                  style={{ height: '38px', fontSize: '13.5px' }}
                />
              </div>

              <div className="login-field" style={{ marginBottom: 0 }}>
                <label className="login-label">OPD Room No.</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="e.g. Room 4"
                  value={regOpdRoom}
                  onChange={(e) => setRegOpdRoom(e.target.value)}
                  disabled={isLoading}
                  style={{ height: '38px', fontSize: '13.5px' }}
                />
              </div>
            </div>

            <div className="login-field" style={{ marginBottom: 0 }}>
              <label className="login-label">Password</label>
              <input
                type="password"
                className="login-input"
                placeholder="Create password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={isLoading}
                style={{ height: '38px', fontSize: '13.5px' }}
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading}
              style={{ height: '42px', marginTop: '6px', backgroundColor: '#00C9B1', color: '#06090E', fontWeight: 700 }}
            >
              {isLoading ? 'Creating account…' : 'Register & Enter Portal →'}
            </button>
          </form>
        )}

        {/* Back link */}
        <a href="http://localhost:3000" className="login-back-link" style={{ marginTop: '14px' }}>
          ← Back to MediKiosk Home
        </a>
      </div>
    </div>
  );
}
