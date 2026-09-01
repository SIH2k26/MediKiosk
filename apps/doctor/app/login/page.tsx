'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInDoctor, registerDoctor, getCurrentDoctorUser } from '../../lib/auth';

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
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-label="Checking session…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-ink-primary flex items-center justify-center p-4" role="main">
      <div className="w-full max-w-[460px] bg-dark-raised border border-dark-rule rounded-lg shadow-card p-6">
        {/* Header Logo */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-md bg-accent-wash border border-dark-rule flex items-center justify-center shrink-0" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L25 9.5V18.5L14 25L3 18.5V9.5L14 3Z" className="stroke-accent" strokeWidth="1.5" fill="none" />
              <path d="M14 10V18M10 14H18" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold text-ink-primary tracking-tight">MediKiosk</div>
            <div className="text-[11px] font-medium text-ink-tertiary">Doctor Clinical Cockpit</div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1 bg-dark-sunken border border-dark-rule p-1 rounded-md mb-5">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setError(null); }}
            className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
              mode === 'LOGIN'
                ? 'bg-accent text-dark shadow-sm'
                : 'text-ink-tertiary hover:text-ink-primary bg-transparent'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setError(null); }}
            className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
              mode === 'REGISTER'
                ? 'bg-accent text-dark shadow-sm'
                : 'text-ink-tertiary hover:text-ink-primary bg-transparent'
            }`}
          >
            Register as Doctor
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-dark-sunken border border-dark-ruleStrong text-signal-critical rounded-md text-xs mb-4 flex items-center gap-2 font-medium" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── 1. SIGN IN FORM ── */}
        {mode === 'LOGIN' && (
          <div>
            {/* Quick 1-Click Demo Profiles */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">
                ⚡ Quick Demo Access (1-Click)
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('dr.sharma@hospital.org')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-2.5 bg-dark-sunken border border-dark-rule hover:border-accent/40 rounded-md text-left transition-all group disabled:opacity-50"
                >
                  <div>
                    <div className="text-xs font-bold text-ink-primary">👨‍⚕️ Dr. Rajesh Sharma, MD</div>
                    <div className="text-[11px] text-ink-tertiary">Internal Medicine & Cardiology · OPD Room 4</div>
                  </div>
                  <span className="text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform">Enter →</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('dr.priya@hospital.org')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-2.5 bg-dark-sunken border border-dark-rule hover:border-accent/40 rounded-md text-left transition-all group disabled:opacity-50"
                >
                  <div>
                    <div className="text-xs font-bold text-ink-primary">👩‍⚕️ Dr. Priya Nair, MS</div>
                    <div className="text-[11px] text-ink-tertiary">Emergency & Triage Specialist · Cockpit 1</div>
                  </div>
                  <span className="text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform">Enter →</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px bg-dark-rule" />
              <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Or Custom Sign-In</span>
              <div className="flex-1 h-px bg-dark-rule" />
            </div>

            <form onSubmit={handleLogin} noValidate className="space-y-3">
              <div>
                <label htmlFor="doctor-email" className="block text-xs font-medium text-ink-secondary mb-1">Doctor Email</label>
                <input
                  id="doctor-email"
                  type="email"
                  className="w-full h-9 px-3 bg-dark-sunken border border-dark-rule rounded-md text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                  placeholder="doctor@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label htmlFor="doctor-password" className="block text-xs font-medium text-ink-secondary mb-1">Password</label>
                <div className="relative">
                  <input
                    id="doctor-password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full h-9 pl-3 pr-8 bg-dark-sunken border border-dark-rule rounded-md text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-tertiary hover:text-ink-primary"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 mt-2 bg-accent hover:bg-accent/90 text-dark font-bold text-xs rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in…' : 'Sign In to OPD Queue →'}
              </button>
            </form>
          </div>
        )}

        {/* ── 2. REGISTER AS DOCTOR FORM ── */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} noValidate className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Doctor Full Name *</label>
              <input
                type="text"
                className="w-full h-9 px-3 bg-dark-sunken border border-dark-rule rounded-md text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                placeholder="e.g. Dr. Rajesh Sharma, MD"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Hospital Email Address *</label>
              <input
                type="email"
                className="w-full h-9 px-3 bg-dark-sunken border border-dark-rule rounded-md text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                placeholder="doctor@hospital.org"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Specialty / Dept</label>
                <input
                  type="text"
                  className="w-full h-9 px-3 bg-dark-sunken border border-dark-rule rounded-md text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                  placeholder="e.g. Cardiology"
                  value={regSpecialty}
                  onChange={(e) => setRegSpecialty(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">OPD Room No.</label>
                <input
                  type="text"
                  className="w-full h-9 px-3 bg-dark-sunken border border-dark-rule rounded-md text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                  placeholder="e.g. Room 4"
                  value={regOpdRoom}
                  onChange={(e) => setRegOpdRoom(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Password</label>
              <input
                type="password"
                className="w-full h-9 px-3 bg-dark-sunken border border-dark-rule rounded-md text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                placeholder="Create password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-2 bg-accent hover:bg-accent/90 text-dark font-bold text-xs rounded-md transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating account…' : 'Register & Enter Portal →'}
            </button>
          </form>
        )}

        {/* Back link */}
        <a
          href="http://localhost:3000"
          className="block text-center text-xs font-medium text-ink-tertiary hover:text-accent transition-colors mt-4"
        >
          ← Back to MediKiosk Home
        </a>
      </div>
    </div>
  );
}