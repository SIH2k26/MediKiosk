'use client';
import './globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAdminUser, signOutAdmin, type AdminUser } from '../lib/auth';

const ADMIN_MODULES = [
  { icon: '👥', title: 'User Management',   desc: 'Manage doctors, triage staff, and admins',          phase: 2, href: '/users'     },
  { icon: '🖥️', title: 'Kiosk Management',  desc: 'Configure physical kiosk devices and locations',    phase: 2, href: '/kiosks'    },
  { icon: '📋', title: 'Audit Logs',        desc: 'View all system actions and security events',        phase: 2, href: '/audit'     },
  { icon: '🌍', title: 'Language Config',   desc: 'Manage supported languages and translations',        phase: 2, href: '/languages' },
  { icon: '❓', title: 'Questionnaire',     desc: 'Configure clinical history questionnaires per dept', phase: 3, href: '/questions' },
  { icon: '📊', title: 'Analytics',         desc: 'OPD volume, wait times, and system performance',     phase: 8, href: '/analytics' },
];

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F1117' }}>
        <div className="page-spinner" aria-label="Authenticating…" />
      </div>
    );
  }

  const initials = user ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AD';

  return (
    <div className="admin-layout">
      {/* Top Nav */}
      <header className="admin-topnav">
        <div className="admin-topnav-logo">
          <div className="admin-topnav-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M7 10h6M10 7v6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="admin-topnav-brand">MediKiosk</span>
          <span className="admin-topnav-badge">Admin Panel</span>
        </div>

        <div className="admin-topnav-right">
          <a href="http://localhost:3000" className="admin-topnav-link">🏠 Home</a>
          <a href="http://localhost:3001" className="admin-topnav-link">👩‍⚕️ Doctor Portal</a>
          <div className="admin-topnav-divider" />
          <div className="admin-user-chip">
            <div className="admin-user-chip-avatar">{initials}</div>
            <span className="admin-user-chip-name">{user?.fullName ?? 'Admin'}</span>
          </div>
          <button
            id="admin-signout-btn"
            className="admin-signout-btn"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out of admin panel"
          >
            {signingOut ? '⏳' : '🚪'} {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="admin-main">
        {/* Hero */}
        <div className="admin-hero fade-in">
          <div>
            <h1 className="admin-hero-title">System Administration</h1>
            <p className="admin-hero-sub">
              Welcome back, <strong>{user?.fullName}</strong>. You have full administrative access to MediKiosk.
            </p>
          </div>
          <div className="admin-hero-meta">
            <div className="admin-status-dot" aria-label="System online" />
            <span>All systems operational</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="admin-stats fade-in">
          {[
            { label: 'Active Kiosks',   value: '4',  icon: '🖥️', color: '#69F0AE' },
            { label: 'Today\'s Patients', value: '127', icon: '👤', color: '#6BA3FF' },
            { label: 'Pending Alerts',  value: '3',  icon: '🚨', color: '#FF6B6B' },
            { label: 'Staff Accounts',  value: '18', icon: '👥', color: '#FFD54F' },
          ].map((s) => (
            <div key={s.label} className="admin-stat-card">
              <span className="admin-stat-icon" aria-hidden="true">{s.icon}</span>
              <div>
                <div className="admin-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="admin-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Module grid */}
        <h2 className="admin-section-title fade-in">Administration Modules</h2>
        <div className="admin-modules-grid">
          {ADMIN_MODULES.map((item, i) => (
            <a
              key={item.title}
              href={item.href}
              className={`admin-module-card fade-in fade-in-${(i % 3) + 1}`}
              aria-label={`${item.title} — Phase ${item.phase}`}
            >
              <div className="admin-module-icon" aria-hidden="true">{item.icon}</div>
              <div>
                <h3 className="admin-module-title">{item.title}</h3>
                <p className="admin-module-desc">{item.desc}</p>
              </div>
              <span className="admin-module-phase">Phase {item.phase}</span>
            </a>
          ))}
        </div>

        {/* Footer notice */}
        <div className="admin-phase-notice fade-in">
          📌 <strong>Phase 1</strong> scaffold — Authentication is live. Full module implementations begin Phase 2.
        </div>
      </main>
    </div>
  );
}
