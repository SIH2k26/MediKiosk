'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInDoctor, getCurrentDoctorUser } from '../../lib/auth';
import './login.css';

export default function DoctorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in with correct role, skip to portal
  useEffect(() => {
    getCurrentDoctorUser().then((user) => {
      if (user) {
        router.replace('/');
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
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

  if (checkingSession) {
    return (
      <div className="login-screen">
        <div className="login-spinner" aria-label="Checking session…" />
      </div>
    );
  }

  return (
    <div className="login-screen" role="main">
      {/* Ambient background orbs */}
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />

      <div className="login-card" aria-labelledby="login-title">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L25 9.5V18.5L14 25L3 18.5V9.5L14 3Z" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M14 10V18M10 14H18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="login-logo-name">MediKiosk</div>
            <div className="login-logo-sub">Doctor Portal</div>
          </div>
        </div>

        {/* Heading */}
        <div className="login-heading">
          <h1 id="login-title" className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to access your OPD queue and patient summaries.</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="login-error" role="alert" aria-live="assertive">
            <span className="login-error-icon" aria-hidden="true">⚠</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="doctor-email" className="login-label">Email Address</label>
            <input
              id="doctor-email"
              type="email"
              className="login-input"
              placeholder="doctor@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="login-field">
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
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            id="doctor-login-btn"
            type="submit"
            className={`login-btn${isLoading ? ' login-btn-loading' : ''}`}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="login-btn-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign In to Portal'
            )}
          </button>
        </form>

        {/* Role notice */}
        <div className="login-notice">
          <span aria-hidden="true">🔒</span>
          Restricted to authorised <strong>Doctors</strong> and <strong>Administrators</strong> only.
          Contact your hospital IT for account setup.
        </div>

        {/* Back link */}
        <a href="http://localhost:3000" className="login-back-link">
          ← Back to MediKiosk Home
        </a>
      </div>
    </div>
  );
}
