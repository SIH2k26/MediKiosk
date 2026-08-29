'use client';
import './globals.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentDoctorUser, signOutDoctor, type DoctorUser } from '../lib/auth';

// Mock queue data for Phase 1 UI scaffold
const MOCK_QUEUE = [
  { token: 'A001', name: 'Ramesh Gupta', age: 52, complaint: 'Chest pain', risk: 'HIGH_PRIORITY', waited: '18 min' },
  { token: 'A002', name: 'Sunita Devi',  age: 34, complaint: 'Fever & cough', risk: 'NORMAL',       waited: '25 min' },
  { token: 'A003', name: 'Mohan Lal',    age: 67, complaint: 'Breathlessness', risk: 'EMERGENCY',    waited: '5 min'  },
  { token: 'A004', name: 'Priya Singh',  age: 28, complaint: 'Abdominal pain', risk: 'WARNING',      waited: '32 min' },
  { token: 'A005', name: 'Arun Kumar',   age: 45, complaint: 'Knee pain',      risk: 'NORMAL',       waited: '40 min' },
];

function riskBadge(risk: string) {
  const map: Record<string, string> = {
    EMERGENCY:     'badge badge-emergency',
    HIGH_PRIORITY: 'badge badge-high-priority',
    WARNING:       'badge badge-warning',
    NORMAL:        'badge badge-normal',
  };
  const labels: Record<string, string> = {
    EMERGENCY:     '🚨 Emergency',
    HIGH_PRIORITY: '⚠️ High Priority',
    WARNING:       '⚡ Warning',
    NORMAL:        '✅ Normal',
  };
  return <span className={map[risk] ?? 'badge badge-normal'}>{labels[risk] ?? risk}</span>;
}

export default function DoctorPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<DoctorUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getCurrentDoctorUser().then((u) => {
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
    await signOutDoctor();
    router.replace('/login');
  };

  // Show nothing while checking auth to avoid flash
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F1117' }}>
        <div className="page-spinner" aria-label="Authenticating…" />
      </div>
    );
  }

  const emergency    = MOCK_QUEUE.filter(p => p.risk === 'EMERGENCY').length;
  const highPriority = MOCK_QUEUE.filter(p => p.risk === 'HIGH_PRIORITY').length;
  const totalWaiting = MOCK_QUEUE.length;
  const initials     = user ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR';

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M10 7V13M7 10H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-name">MediKiosk</div>
            <div className="sidebar-logo-sub">Doctor Portal</div>
          </div>
        </div>

        <div className="nav-section-label">OPD</div>
        <a href="/queue"    className="nav-item active">📋 Patient Queue</a>
        <a href="/triage"   className="nav-item">🚨 Triage Alerts</a>

        <div className="nav-section-label">Patients</div>
        <a href="/patients" className="nav-item">👤 All Patients</a>
        <a href="/history"  className="nav-item">📁 History Records</a>

        <div style={{ marginTop: 'auto' }}>
          {/* User badge */}
          {user && (
            <div className="sidebar-user-badge">
              <div className="sidebar-user-avatar" aria-hidden="true">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.fullName}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            </div>
          )}
          <div className="nav-section-label">Account</div>
          <a href="/settings" className="nav-item">⚙️ Settings</a>
          <button
            id="doctor-signout-btn"
            className="nav-item nav-item-signout"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out of doctor portal"
          >
            🚪 {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="portal-main">
        <div className="portal-topbar">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              OPD Queue
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {user?.fullName ?? 'Doctor'}
            </span>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {initials}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid fade-in">
          <div className="stat-card">
            <div className="stat-value">{totalWaiting}</div>
            <div className="stat-label">Waiting</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'rgba(217,48,37,0.3)' }}>
            <div className="stat-value" style={{ color: '#FF6B6B' }}>{emergency}</div>
            <div className="stat-label">🚨 Emergency</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'rgba(250,123,23,0.3)' }}>
            <div className="stat-value" style={{ color: '#FFA552' }}>{highPriority}</div>
            <div className="stat-label">⚠️ High Priority</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#69F0AE' }}>12</div>
            <div className="stat-label">Seen Today</div>
          </div>
        </div>

        {/* Queue table */}
        <div className="card fade-in fade-in-1">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Patient Queue</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost">🔄 Refresh</button>
              <button className="btn btn-primary">➕ Add Walk-in</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Age</th>
                  <th>Chief Complaint</th>
                  <th>Risk Level</th>
                  <th>Wait Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_QUEUE
                  .sort((a, b) => {
                    const order = { EMERGENCY: 0, HIGH_PRIORITY: 1, WARNING: 2, NORMAL: 3 };
                    return (order[a.risk as keyof typeof order] ?? 4) - (order[b.risk as keyof typeof order] ?? 4);
                  })
                  .map((patient) => (
                    <tr key={patient.token}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{patient.token}</td>
                      <td style={{ fontWeight: 600 }}>{patient.name}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{patient.age}y</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{patient.complaint}</td>
                      <td>{riskBadge(patient.risk)}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{patient.waited}</td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phase notice */}
        <div
          className="fade-in fade-in-2"
          style={{
            marginTop: '1.5rem',
            padding: '1rem 1.5rem',
            background: 'rgba(26,115,232,0.08)',
            border: '1px solid rgba(26,115,232,0.2)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          📌 <strong style={{ color: 'var(--color-primary)' }}>Phase 1</strong> — Queue UI scaffold with mock data.
          Real-time queue with Supabase Realtime, AI summaries, and doctor review will be implemented in <strong>Phases 5–6</strong>.
        </div>
      </main>
    </div>
  );
}
