'use client';

import '../globals.css';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentDoctorUser, signOutDoctor, type DoctorUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { TriageAlert, RiskLevel } from '@medikiosk/shared-types';

const SEED_TRIAGE_ALERTS: TriageAlert[] = [
  {
    id: 'alert-001',
    sessionId: '22222222-2222-2222-2222-222222222222',
    patientId: '11111111-1111-1111-1111-111111111111',
    riskLevel: 'HIGH_PRIORITY',
    priorityScore: 75,
    suggestedAction: 'Acute retrosternal chest pain >2 hours with diaphoresis detected in intake',
    clinicalCategory: 'CARDIOLOGY',
    alertStatus: 'ACTIVE',
    isAcknowledged: false,
    redFlags: [],
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    patient: {
      firstName: 'Ramesh',
      lastName: 'Gupta',
      age: 58,
      gender: 'MALE',
    },
  },
  {
    id: 'alert-002',
    sessionId: '88888888-8888-8888-8888-888888888888',
    patientId: '99999999-9999-9999-9999-999999999999',
    riskLevel: 'WARNING',
    priorityScore: 50,
    suggestedAction: 'Persistent severe headache with photophobia and nausea for 3 days',
    clinicalCategory: 'NEUROLOGY',
    alertStatus: 'ACTIVE',
    isAcknowledged: false,
    redFlags: [],
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    patient: {
      firstName: 'Arjun',
      lastName: 'Sharma',
      age: 34,
      gender: 'MALE',
    },
  },
  {
    id: 'alert-003',
    sessionId: '33333333-3333-3333-3333-333333333333',
    patientId: '44444444-4444-4444-4444-444444444444',
    riskLevel: 'EMERGENCY',
    priorityScore: 95,
    suggestedAction: 'Acute respiratory distress with peripheral cyanosis reported',
    clinicalCategory: 'PULMONOLOGY',
    alertStatus: 'ACKNOWLEDGED',
    isAcknowledged: true,
    redFlags: [],
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 60000).toISOString(),
    patient: {
      firstName: 'Vikram',
      lastName: 'Singh',
      age: 62,
      gender: 'MALE',
    },
  },
];

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; borderColor: string; pulse: boolean }> = {
  EMERGENCY:     { label: '🚨 Emergency',    color: '#FF6B6B', bgColor: 'rgba(217,48,37,0.1)',   borderColor: 'rgba(217,48,37,0.4)',  pulse: true  },
  HIGH_PRIORITY: { label: '⚠️ High Priority', color: '#FFA552', bgColor: 'rgba(250,123,23,0.08)',  borderColor: 'rgba(250,123,23,0.3)',  pulse: true  },
  WARNING:       { label: '⚡ Warning',       color: '#FFD54F', bgColor: 'rgba(255,213,79,0.08)',  borderColor: 'rgba(255,213,79,0.25)', pulse: false },
  NORMAL:        { label: '✅ Normal',        color: '#69F0AE', bgColor: 'rgba(105,240,174,0.06)', borderColor: 'rgba(105,240,174,0.2)', pulse: false },
};

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function MediKioskLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function DoctorTriagePage() {
  const router = useRouter();
  const [user, setUser] = useState<DoctorUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [alerts, setAlerts] = useState<TriageAlert[]>(SEED_TRIAGE_ALERTS);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);

  // ── Auth ────────────────────────────────────────────────────────────────────
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

  // ── Alert tone ──────────────────────────────────────────────────────────────
  const playTone = useCallback(() => {
    try {
      const ctx = audioRef.current ?? (audioRef.current = new AudioContext());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* AudioContext blocked */ }
  }, []);

  // ── Initial fetch ────────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token ?? '';
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/triage/alerts?limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setAlerts(json.data as TriageAlert[]);
      }
    } catch {
      // Keep seed alerts fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked) fetchAlerts();
  }, [authChecked, fetchAlerts]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, alertStatus: 'ACKNOWLEDGED', isAcknowledged: true } : a));
  };

  const handleEscalate = (id: string) => {
    const notes = prompt('Enter Escalation Notes / Rapid Response Call:');
    if (notes?.trim()) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, alertStatus: 'ESCALATED', escalationNotes: notes } : a));
    }
  };

  const handleResolve = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, alertStatus: 'RESOLVED' } : a));
  };

  const handleSignOut = async () => {
    await signOutDoctor();
    router.replace('/login');
  };

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sorted = [...alerts].sort((a, b) => {
    const diff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activeAlerts  = sorted.filter((a) => a.alertStatus === 'ACTIVE');
  const otherAlerts   = sorted.filter((a) => a.alertStatus !== 'ACTIVE');
  const initials      = user ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'DR';

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#06090E', color: '#F0F4F8' }}>
        <p>Authenticating…</p>
      </div>
    );
  }

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="sidebar" role="navigation" aria-label="Doctor portal navigation">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <MediKioskLogo />
          </div>
          <div>
            <div className="sidebar-logo-name">MediKiosk</div>
            <div className="sidebar-logo-sub">Doctor Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">OPD</div>
          <Link href="/" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 6h12M2 10h12M6 2v12M10 2v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Patient Queue
          </Link>
          <Link href="/triage" className="nav-item active" aria-current="page">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2L14 9H2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Real-time Triage
            {activeAlerts.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 7px',
                color: '#EF4444',
              }}>
                {activeAlerts.length}
              </span>
            )}
          </Link>
          <Link href="/history" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v5l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Past Encounters
          </Link>

          <div className="nav-section-label">Portals</div>
          <a href="http://localhost:3000" className="nav-item" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5 13v2M11 13v2M3 15h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Patient Kiosk
          </a>
          <a href="http://localhost:3002" className="nav-item" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
            Admin Console
          </a>
        </nav>

        <div className="sidebar-user-section">
          {user && (
            <div className="sidebar-user-badge">
              <div className="sidebar-user-avatar" aria-hidden="true">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.fullName}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            </div>
          )}
          <button className="nav-item nav-item-signout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="portal-main">
        <div className="portal-topbar">
          <div>
            <h1 className="portal-topbar-title">Real-Time Clinical Triage Signals</h1>
            <p className="portal-topbar-sub">AST Rule Engine signals & red flags detected during live patient kiosk intakes.</p>
          </div>
          <div className="portal-topbar-right">
            <span style={{ fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <span className="status-dot" />
              AST Engine Live
            </span>
          </div>
        </div>

        <div className="portal-content">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <div className="page-spinner" />
            </div>
          ) : (
            <>
              {/* Active Alerts */}
              {activeAlerts.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240, 244, 248, 0.5)', marginBottom: '12px' }}>
                    Active Priority Signals ({activeAlerts.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeAlerts.map((alert) => {
                      const risk = RISK_CONFIG[alert.riskLevel] ?? RISK_CONFIG.NORMAL;
                      return (
                        <div
                          key={alert.id}
                          className="card fade-in"
                          style={{
                            borderColor: risk.borderColor,
                            background: risk.bgColor,
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'flex-start',
                            padding: '16px 20px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className={`badge badge-${alert.riskLevel.toLowerCase().replace('_', '-')}`}>
                                  {risk.label}
                                </span>
                                {alert.clinicalCategory && (
                                  <span style={{ fontSize: '11px', textTransform: 'uppercase', padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', color: 'rgba(240,244,248,0.7)', fontWeight: 600 }}>
                                    {alert.clinicalCategory}
                                  </span>
                                )}
                                <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>
                                  SCORE: {alert.priorityScore}
                                </span>
                              </div>
                              <span style={{ fontSize: '12px', color: 'rgba(240, 244, 248, 0.4)' }}>
                                {timeAgo(alert.createdAt)}
                              </span>
                            </div>

                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0F4F8', margin: '0 0 6px 0' }}>
                              {alert.suggestedAction || 'Priority signal flagged during intake'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                              SESSION: {alert.sessionId} {alert.patient ? `· ${alert.patient.firstName} ${alert.patient.lastName} (${alert.patient.age}y ${alert.patient.gender})` : ''}
                            </p>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                            <button
                              className="btn btn-primary"
                              style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              ✓ Acknowledge
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ height: '32px', padding: '0 12px', fontSize: '12px', color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.3)' }}
                              onClick={() => handleEscalate(alert.id)}
                            >
                              ⚡ Escalate
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Handled / History Alerts */}
              {otherAlerts.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240, 244, 248, 0.5)', marginBottom: '12px' }}>
                    Acknowledged & Escalated Signals ({otherAlerts.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {otherAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="card"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 18px',
                          opacity: 0.8,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: alert.alertStatus === 'ESCALATED' ? '#EF4444' : '#10B981' }}>
                              ● {alert.alertStatus}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{alert.suggestedAction}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)' }}>
                            {alert.clinicalCategory} · {timeAgo(alert.createdAt)}
                          </div>
                        </div>
                        <button
                          className="btn btn-secondary"
                          style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                          onClick={() => handleResolve(alert.id)}
                        >
                          Mark Resolved
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
