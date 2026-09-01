'use client';
import './globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAdminUser, signOutAdmin, type AdminUser } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { NavItem } from '../components/ui/nav-item';

const ADMIN_MODULES = [
  { icon: '👥', title: 'User Management',   desc: 'Manage doctors, triage staff, and admin accounts',       phase: 'Live',       phaseClass: 'success', href: '/users'     },
  { icon: '🖥️', title: 'Kiosk Management',  desc: 'Configure physical kiosk devices and deployment sites',  phase: 'Live',       phaseClass: 'success', href: '/kiosks'    },
  { icon: '📋', title: 'Audit Logs',        desc: 'View all system actions, clinical events, and security',  phase: 'Live',       phaseClass: 'success', href: '/audit'     },
  { icon: '🌍', title: 'Language Config',   desc: 'Manage supported languages and UI translations',           phase: 'Live',       phaseClass: 'success', href: '/languages' },
  { icon: '❓', title: 'Questionnaire',     desc: 'Configure clinical questionnaires per department',         phase: 'In Progress', phaseClass: 'warning',  href: '/questions' },
  { icon: '📊', title: 'Analytics',         desc: 'OPD volume, wait times, and system performance metrics',  phase: 'Planned',    phaseClass: 'muted',    href: '/analytics' },
] as const;

function MediKioskLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getCurrentAdminUser().then((u) => {
      if (!u) {
        router.replace('/login');
      } else {
        setUser(u);
        setAuthChecked(true);
      }
    });
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutAdmin();
    router.replace('/login');
  };

  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-dark">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-label="Authenticating…" />
        <p className="text-sm text-ink-muted">Authenticating…</p>
      </div>
    );
  }

  const initials = user ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD';

  const STATS = [
    { label: 'Active Kiosks',    value: '4',   icon: '🖥️' },
    { label: "Today's Patients", value: '127', icon: '👤' },
    { label: 'Pending Alerts',   value: '3',   icon: '🚨' },
    { label: 'Staff Accounts',   value: '18',  icon: '👥' },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-dark text-ink-primary">
      {/* ── Top Navigation ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-dark-rule bg-dark-raised" role="banner">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="text-accent" aria-hidden="true">
            <MediKioskLogo />
          </div>
          <span className="font-bold text-ink-primary">MediKiosk</span>
          <span className="px-2 py-1 text-xs font-medium rounded-md bg-accent-wash text-accent border border-dark-rule">Admin Panel</span>
        </div>

        {/* Right side */}
        <nav className="flex items-center gap-4" aria-label="Top navigation links">
          <NavItem href="http://localhost:3000" target="_blank" rel="noopener noreferrer">
            Patient Kiosk
          </NavItem>
          <NavItem href="http://localhost:3001" target="_blank" rel="noopener noreferrer">
            Doctor Portal
          </NavItem>
          <div className="w-px h-6 bg-dark-rule" aria-hidden="true" />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-sunken border border-dark-rule" aria-label={`Signed in as ${user?.fullName}`}>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-dark text-[10px] font-bold" aria-hidden="true">
              {initials}
            </div>
            <span className="text-sm font-medium text-ink-primary">{user?.fullName ?? 'Admin'}</span>
          </div>

          <Button
            id="admin-signout-btn"
            variant="ghost"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out of admin panel"
          >
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </Button>
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8" role="main">
        {/* Hero row */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink-primary mb-2">System Administration</h1>
            <p className="text-ink-secondary max-w-2xl">
              Welcome back, <strong className="text-ink-primary">{user?.fullName}</strong>.{' '}
              Full administrative access to MediKiosk infrastructure and configuration.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-dark-sunken border border-dark-rule text-sm text-ink-secondary" role="status" aria-live="polite">
            <div className="w-2 h-2 rounded-full bg-accent" aria-label="All systems online" />
            All systems operational
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" role="region" aria-label="System statistics">
          {STATS.map((s) => (
            <Card key={s.label} className="bg-dark-raised border-dark-rule shadow-card rounded-lg">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-dark-sunken border border-dark-rule text-xl" aria-hidden="true">
                  {s.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink-primary">{s.value}</div>
                  <div className="text-sm text-ink-tertiary">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Module grid */}
        <div>
          <h2 className="text-xl font-bold text-ink-primary mb-4">Administration Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Administration modules">
            {ADMIN_MODULES.map((mod) => (
              <a
                key={mod.title}
                href={mod.href}
                className="block group"
                role="listitem"
                aria-label={`${mod.title} — ${mod.desc}`}
              >
                <Card className="h-full transition-colors bg-dark-raised border-dark-rule group-hover:border-dark-ruleStrong shadow-card rounded-lg">
                  <CardContent className="p-6 flex flex-col h-full gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-dark-sunken border border-dark-rule text-lg" aria-hidden="true">
                        {mod.icon}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
                        mod.phaseClass === 'success' ? 'bg-accent-wash text-accent border-dark-rule' :
                        mod.phaseClass === 'warning' ? 'bg-dark-sunken text-signal-warning border-dark-rule' :
                        'bg-dark-sunken text-ink-muted border-dark-rule'
                      }`}>
                        {mod.phase}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-ink-primary mb-1 group-hover:text-accent transition-colors">{mod.title}</div>
                      <p className="text-sm text-ink-secondary">{mod.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>

        {/* Phase notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-accent-wash border border-dark-rule text-sm text-accent" role="note">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10 6v4M10 13h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <strong className="font-semibold">SIH 2026 Prototype</strong> — This admin console is in active development.
            {' '}Modules marked <strong className="font-semibold text-ink-primary">Live</strong> are fully functional.{' '}
            <strong className="font-semibold text-ink-primary">In Progress</strong> modules are being built.{' '}
            <strong className="font-semibold text-ink-primary">Planned</strong> modules are designed and queued for Phase 3.
          </div>
        </div>
      </main>
    </div>
  );
}