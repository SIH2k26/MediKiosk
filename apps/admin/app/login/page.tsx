'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInAdmin, getCurrentAdminUser } from '../../lib/auth';
import './login.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@hospital.org');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

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
    if (!email.trim()) {
      setError('Please enter your administrator email.');
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

  const handleQuickDemoAdmin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInAdmin('admin@hospital.org', 'admin123');
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

      <div className="login-card login-card-admin" style={{ maxWidth: '440px', padding: '24px 28px' }}>
        {/* Logo */}
        <div className="login-logo" style={{ marginBottom: '16px' }}>
          <div className="login-logo-icon login-logo-icon-admin" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <path d="M14 3L25 9.5V18.5L14 25L3 18.5V9.5L14 3Z" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M9 14h10M14 9v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="login-logo-name" style={{ fontSize: '17px' }}>MediKiosk</div>
            <div className="login-logo-sub login-logo-sub-admin" style={{ fontSize: '11px' }}>Admin Command Console</div>
          </div>
        </div>

        {/* Heading */}
        <div className="login-heading" style={{ marginBottom: '16px' }}>
          <h1 id="admin-login-title" className="login-title" style={{ fontSize: '20px', margin: '0 0 4px 0' }}>Administrator Access</h1>
          <p className="login-subtitle" style={{ fontSize: '12.5px', margin: 0 }}>System configuration, audit logs, and hospital operations.</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="login-error" role="alert" style={{ padding: '8px 12px', marginBottom: '12px', fontSize: '13px' }}>
            <span className="login-error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Quick 1-Click Demo Admin Button */}
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            onClick={handleQuickDemoAdmin}
            disabled={isLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'rgba(124, 58, 237, 0.12)',
              border: '1px solid rgba(124, 58, 237, 0.35)',
              borderRadius: '8px',
              color: '#F0F4F8',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>⚡ 1-Click Administrator Access</div>
              <div style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.6)' }}>admin@hospital.org · Full Control</div>
            </div>
            <span style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 700 }}>Enter →</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '11px', color: 'rgba(240,244,248,0.4)', textTransform: 'uppercase' }}>Or Custom Login</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field" style={{ marginBottom: '10px' }}>
            <label htmlFor="admin-email" className="login-label">Administrator Email</label>
            <input
              id="admin-email"
              type="email"
              className="login-input"
              placeholder="admin@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              style={{ height: '38px', fontSize: '13.5px' }}
              required
            />
          </div>

          <div className="login-field" style={{ marginBottom: '14px' }}>
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
            className="login-btn login-btn-admin"
            disabled={isLoading}
            style={{ height: '42px' }}
          >
            {isLoading ? 'Signing in…' : 'Sign In to Admin Console →'}
          </button>
        </form>

        {/* Back link */}
        <a href="http://localhost:3000" className="login-back-link" style={{ marginTop: '14px' }}>
          ← Back to MediKiosk Home
        </a>
      </div>
    </div>
  );
}
