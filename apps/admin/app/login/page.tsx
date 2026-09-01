'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInAdmin, getCurrentAdminUser } from '../../lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-label="Checking session…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-4" role="main">
      <Card className="w-full max-w-md bg-dark-raised border-dark-rule shadow-raised">
        <CardHeader className="pb-4">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-dark font-bold" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <path d="M14 3L25 9.5V18.5L14 25L3 18.5V9.5L14 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M9 14h10M14 9v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-ink-primary">MediKiosk</div>
              <div className="text-xs text-ink-tertiary uppercase tracking-wider">Admin Command Console</div>
            </div>
          </div>

          {/* Heading */}
          <CardTitle id="admin-login-title" className="text-2xl font-bold text-ink-primary mb-1">Administrator Access</CardTitle>
          <p className="text-sm text-ink-secondary">System configuration, audit logs, and hospital operations.</p>
        </CardHeader>
        
        <CardContent>
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-dark-sunken border border-dark-rule text-signal-critical text-sm" role="alert">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Quick 1-Click Demo Admin Button */}
          <button
            type="button"
            onClick={handleQuickDemoAdmin}
            disabled={isLoading}
            className="w-full flex items-center justify-between p-3 mb-6 rounded-md bg-accent-wash border border-dark-rule text-left transition-colors hover:bg-dark-sunken disabled:opacity-50"
          >
            <div>
              <div className="text-sm font-bold text-ink-primary">⚡ 1-Click Administrator Access</div>
              <div className="text-xs text-accent">admin@hospital.org · Full Control</div>
            </div>
            <span className="text-sm font-bold text-accent">Enter →</span>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-dark-rule" />
            <span className="text-xs text-ink-muted uppercase tracking-wider font-medium">Or Custom Login</span>
            <div className="flex-1 h-px bg-dark-rule" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-sm font-medium text-ink-primary">Administrator Email</label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-sm font-medium text-ink-primary">Password</label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary focus:outline-none"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              className="w-full mt-2"
            >
              {isLoading ? 'Signing in…' : 'Sign In to Admin Console →'}
            </Button>
          </form>

          {/* Back link */}
          <div className="mt-6 text-center">
            <a href="http://localhost:3000" className="text-sm text-ink-tertiary hover:text-ink-primary transition-colors">
              ← Back to MediKiosk Home
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}