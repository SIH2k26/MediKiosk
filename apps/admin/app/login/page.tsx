'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInAdmin, getCurrentAdminUser } from '../../lib/auth';
import './login.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in as admin, skip to dashboard
  useEffect(() => {
    getCurrentAdminUser().then((user) => {
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
      setError('Please enter your administrator email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signInAdmin(email.trim(), password);
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

      <div className="login-card login-card-admin" aria-labelledby="admin-login-title">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon login-logo-icon-admin" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L25 9.5V18.5L14 25L3 18.5V9.5L14 3Z" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M9 14h10M14 9v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="login-logo-name">MediKiosk</div>
            <div className="login-logo-sub login-logo-sub-admin">Admin Panel</div>
          </div>
        </div>

        {/* Heading */}
        <div className="login-heading">
          <h1 id="admin-login-title" className="login-title">Administrator Access</h1>
          <p className="login-subtitle">Restricted portal. System administrators only.</p>
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
            <label htmlFor="admin-email" className="login-label">Administrator Email</label>
            <input
              id="admin-email"
              type="email"
              className="login-input"
              placeholder="admin@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="admin-password" className="login-label">Password</label>
            <div className="login-input-group">
              <input
                id="admin-password"
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
            id="admin-login-btn"
            type="submit"
            className={`login-btn login-btn-admin${isLoading ? ' login-btn-loading' : ''}`}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="login-btn-spinner" aria-hidden="true" />
                Authenticating…
              </>
            ) : (
              'Access Admin Panel'
            )}
          </button>
        </form>

        {/* Strict role notice */}
        <div className="login-notice login-notice-admin">
          <span aria-hidden="true">🛡</span>
          Access restricted to <strong>System Administrators</strong> only.
          All login attempts are logged and audited.
        </div>

        {/* Back link */}
        <a href="http://localhost:3000" className="login-back-link">
          ← Back to MediKiosk Home
        </a>
      </div>
    </div>
  );
}
