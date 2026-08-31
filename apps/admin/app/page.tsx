'use client';
import './globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAdminUser, signOutAdmin, type AdminUser } from '../lib/auth';

const ADMIN_MODULES = [
  { icon: '👥', title: 'User Management',   desc: 'Manage doctors, triage staff, and admin accounts',       phase: 'Live',       phaseClass: 'admin-module-phase-done', href: '/users'     },
  { icon: '🖥️', title: 'Kiosk Management',  desc: 'Configure physical kiosk devices and deployment sites',  phase: 'Live',       phaseClass: 'admin-module-phase-done', href: '/kiosks'    },
  { icon: '📋', title: 'Audit Logs',        desc: 'View all system actions, clinical events, and security',  phase: 'Live',       phaseClass: 'admin-module-phase-done', href: '/audit'     },
  { icon: '🌍', title: 'Language Config',   desc: 'Manage supported languages and UI translations',           phase: 'Live',       phaseClass: 'admin-module-phase-done', href: '/languages' },
  { icon: '❓', title: 'Questionnaire',     desc: 'Configure clinical questionnaires per department',         phase: 'In Progress', phaseClass: 'admin-module-phase-wip',  href: '/questions' },
  { icon: '📊', title: 'Analytics',         desc: 'OPD volume, wait times, and system performance metrics',  phase: 'Planned',    phaseClass: '',                        href: '/analytics' },
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
        <div className="page-spinner" aria-label="Authenticating…" />
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Authenticating…</p>
      </div>
    );
  }

  const initials = user ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD';

  const STATS = [
    { label: 'Active Kiosks',    value: '4',   icon: '🖥️', color: 'var(--color-primary)' },
    { label: "Today's Patients", value: '127', icon: '👤', color: '#93C5FD' },
    { label: 'Pending Alerts',   value: '3',   icon: '🚨', color: '#FCA5A5' },
    { label: 'Staff Accounts',   value: '18',  icon: '👥', color: '#FCD34D' },
  ] as const;

  return (
    <div className="admin-layout">
      {/* ── Top Navigation ── */}
      <header className="admin-topnav" role="banner">
        {/* Brand */}
        <div className="admin-topnav-logo">
          <div className="admin-topnav-icon" aria-hidden="true">
            <MediKioskLogo />
          </div>
          <span className="admin-topnav-brand">MediKiosk</span>
          <span className="admin-topnav-badge">Admin Panel</span>
        </div>

        {/* Right side */}
        <nav className="admin-topnav-right" aria-label="Top navigation links">
          <a href="http://localhost:3000" className="admin-topnav-link" target="_blank" rel="noopener noreferrer">
            Patient Kiosk
          </a>
          <a href="http://localhost:3001" className="admin-topnav-link" target="_blank" rel="noopener noreferrer">
            Doctor Portal
          </a>
          <div className="admin-topnav-divider" aria-hidden="true" />

          <div className="admin-user-chip" aria-label={`Signed in as ${user?.fullName}`}>
            <div className="admin-user-chip-avatar" aria-hidden="true">{initials}</div>
            <span className="admin-user-chip-name">{user?.fullName ?? 'Admin'}</span>
          </div>

          <button
            id="admin-signout-btn"
            className="admin-signout-btn"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out of admin panel"
          >
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="admin-main" role="main">

        {/* Hero row */}
        <div className="admin-hero fade-in">
          <div>
            <h1 className="admin-hero-title">System Administration</h1>
            <p className="admin-hero-sub">
              Welcome back, <strong>{user?.fullName}</strong>.{' '}
              Full administrative access to MediKiosk infrastructure and configuration.
            </p>
          </div>
          <div className="admin-hero-meta" role="status" aria-live="polite">
            <div className="admin-status-dot" aria-label="All systems online" />
            All systems operational
          </div>
        </div>

        {/* Stats */}
        <div className="admin-stats fade-in fade-in-1" role="region" aria-label="System statistics">
          {STATS.map((s) => (
            <div key={s.label} className="admin-stat-card">
              <div className="admin-stat-icon-box" aria-hidden="true">{s.icon}</div>
              <div>
                <div className="admin-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="admin-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Module grid */}
        <h2 className="admin-section-title fade-in fade-in-2">Administration Modules</h2>
        <div className="admin-modules-grid" role="list" aria-label="Administration modules">
          {ADMIN_MODULES.map((mod, i) => (
            <a
              key={mod.title}
              href={mod.href}
              className={`admin-module-card fade-in fade-in-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
              role="listitem"
              aria-label={`${mod.title} — ${mod.desc}`}
            >
              <div className="admin-module-icon" aria-hidden="true">{mod.icon}</div>
              <div>
                <div className="admin-module-title">{mod.title}</div>
                <p className="admin-module-desc">{mod.desc}</p>
              </div>
              <span className={`admin-module-phase${mod.phaseClass ? ` ${mod.phaseClass}` : ''}`}>
                {mod.phase}
              </span>
            </a>
          ))}
        </div>

        {/* Phase notice */}
        <div className="admin-phase-notice fade-in fade-in-4" role="note">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10 6v4M10 13h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <strong>SIH 2026 Prototype</strong> — This admin console is in active development.
            {' '}Modules marked <strong>Live</strong> are fully functional.{' '}
            <strong>In Progress</strong> modules are being built.{' '}
            <strong>Planned</strong> modules are designed and queued for Phase 3.
          </div>
        </div>
      </main>
    </div>
  );
}
