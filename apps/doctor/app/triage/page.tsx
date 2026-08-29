'use client';
import '../globals.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentDoctorUser, type DoctorUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { TriageAlert, RiskLevel, AlertStatus } from '@medikiosk/shared-types';

// ─── Badge helpers ────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; borderColor: string; pulse: boolean }> = {
  EMERGENCY:     { label: '🚨 Emergency',    color: '#FF6B6B', bgColor: 'rgba(217,48,37,0.1)',   borderColor: 'rgba(217,48,37,0.4)',  pulse: true  },
  HIGH_PRIORITY: { label: '⚠️ High Priority', color: '#FFA552', bgColor: 'rgba(250,123,23,0.08)',  borderColor: 'rgba(250,123,23,0.3)',  pulse: true  },
  WARNING:       { label: '⚡ Warning',       color: '#FFD54F', bgColor: 'rgba(255,213,79,0.08)',  borderColor: 'rgba(255,213,79,0.25)', pulse: false },
  NORMAL:        { label: '✅ Normal',        color: '#69F0AE', bgColor: 'rgba(105,240,174,0.06)', borderColor: 'rgba(105,240,174,0.2)', pulse: false },
};

const STATUS_LABEL: Record<AlertStatus, string> = {
  ACTIVE:       'Active',
  ACKNOWLEDGED: 'Acknowledged',
  ESCALATED:    'Escalated',
  RESOLVED:     'Resolved',
};

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DoctorTriagePage() {
  const router = useRouter();
  const [user, setUser] = useState<DoctorUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [alerts, setAlerts] = useState<TriageAlert[]>([]);
  const [loading, setLoading] = useState(true);
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
      if (json.success) setAlerts(json.data as TriageAlert[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked) fetchAlerts();
  }, [authChecked, fetchAlerts]);

  // ── Supabase Realtime — DOCTOR role, RLS filters to permitted rows ───────────
  useEffect(() => {
    if (!authChecked) return;

    const channel = supabase
      .channel('doctor-triage-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'triage_alerts' },
        (payload) => {
          const incoming = payload.new as TriageAlert | undefined;
          const old = payload.old as TriageAlert | undefined;

          if (payload.eventType === 'INSERT' && incoming) {
            setAlerts((prev) => {
              if (prev.some((a) => a.id === incoming.id)) return prev;
              if (['EMERGENCY', 'HIGH_PRIORITY'].includes(incoming.riskLevel ?? '')) {
                playTone();
                setNewCount((c) => c + 1);
              }
              return [incoming, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && incoming) {
            setAlerts((prev) =>
              prev.map((a) => (a.id === incoming.id ? { ...a, ...incoming } : a))
            );
          } else if (payload.eventType === 'DELETE' && old) {
            setAlerts((prev) => prev.filter((a) => a.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authChecked, playTone]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const apiAction = async (alertId: string, endpoint: string, body: Record<string, string> = {}) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token ?? '';
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/triage/alerts/${alertId}/${endpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }
    );
    return res.json();
  };

  const handleAcknowledge = (id: string) => apiAction(id, 'acknowledge');
  const handleEscalate = async (id: string) => {
    const notes = prompt('Escalation notes:');
    if (notes?.trim()) await apiAction(id, 'escalate', { escalation_notes: notes });
  };

  // ── Sort — priority then time ─────────────────────────────────────────────
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F1117' }}>
        <div className="page-spinner" aria-label="Authenticating…" />
      </div>
    );
  }

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
        <a href="/queue"  className="nav-item">📋 Patient Queue</a>
        <a href="/triage" className="nav-item active">
          🚨 Triage Alerts
          {activeAlerts.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(217,48,37,0.2)',
              border: '1px solid rgba(217,48,37,0.4)',
              borderRadius: '999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.1rem 0.5rem',
              color: '#FF6B6B',
            }}>
              {activeAlerts.length}
            </span>
          )}
        </a>

        <div className="nav-section-label">Patients</div>
        <a href="/patients" className="nav-item">👤 All Patients</a>
        <a href="/history"  className="nav-item">📁 History Records</a>

        <div style={{ marginTop: 'auto' }}>
          {user && (
            <div className="sidebar-user-badge">
              <div className="sidebar-user-avatar" aria-hidden="true">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.fullName}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="portal-main">
        <div className="portal-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Triage Alerts
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Real-time · Potential red flags detected — not diagnoses · Clinical assessment required
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {newCount > 0 && (
              <button
                style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  padding: '0.3rem 0.75rem',
                  background: 'rgba(217,48,37,0.15)',
                  border: '1px solid rgba(217,48,37,0.35)',
                  borderRadius: '999px', color: '#FF6B6B', cursor: 'pointer',
                }}
                onClick={() => setNewCount(0)}
              >
                {newCount} new
              </button>
            )}
            <span style={{ fontSize: '0.75rem', color: '#69F0AE', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#69F0AE', boxShadow: '0 0 5px #69F0AE', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
              Live
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <div className="page-spinner" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <p>No triage alerts at this time.</p>
          </div>
        ) : (
          <>
            {/* Active alerts */}
            {activeAlerts.length > 0 && (
              <>
                <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                  Active Alerts
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
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
                          gap: '1rem',
                          alignItems: 'flex-start',
                          animation: risk.pulse ? 'emergencyPulse 3s ease-in-out infinite' : undefined,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className={`badge badge-${alert.riskLevel.toLowerCase().replace('_', '-')}`}>
                                {risk.label}
                              </span>
                              {alert.clinicalCategory && (
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.15rem 0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', borderRadius: '999px', color: 'var(--color-text-muted)' }}>
                                  {alert.clinicalCategory}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                              {timeAgo(alert.createdAt)}
                            </span>
                          </div>

                          {alert.patient && (
                            <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
                              {alert.patient.firstName} {alert.patient.lastName}
                              {alert.patient.age && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}> · {alert.patient.age}y</span>}
                            </p>
                          )}

                          {alert.suggestedAction && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                              {alert.suggestedAction}
                            </p>
                          )}

                          {alert.timeToInterventionMinutes && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                              ⏱ Recommended intervention within <strong style={{ color: 'var(--color-text-secondary)' }}>{alert.timeToInterventionMinutes} min</strong>
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              id={`ack-${alert.id}`}
                              className="btn btn-primary"
                              style={{ fontSize: '0.78rem', padding: '0.4rem 0.875rem' }}
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              ✓ Acknowledge
                            </button>
                            <button
                              id={`escalate-${alert.id}`}
                              className="btn btn-ghost"
                              style={{ fontSize: '0.78rem', padding: '0.4rem 0.875rem' }}
                              onClick={() => handleEscalate(alert.id)}
                            >
                              ↑ Escalate
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Other alerts */}
            {otherAlerts.length > 0 && (
              <>
                <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                  Closed / Escalated
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {otherAlerts.map((alert) => {
                    const risk = RISK_CONFIG[alert.riskLevel] ?? RISK_CONFIG.NORMAL;
                    return (
                      <div key={alert.id} className="card" style={{ opacity: 0.65, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: risk.color }}>{risk.label}</span>
                          {alert.patient && (
                            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                              {alert.patient.firstName} {alert.patient.lastName}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                            {STATUS_LABEL[alert.alertStatus]}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{timeAgo(alert.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Disclaimer */}
        <div style={{
          marginTop: '1.5rem',
          padding: '0.875rem 1.25rem',
          background: 'rgba(26,115,232,0.06)',
          border: '1px solid rgba(26,115,232,0.15)',
          borderRadius: 'var(--radius-lg)',
          fontSize: '0.8rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.55,
        }}>
          🔒 <strong style={{ color: 'var(--color-primary)' }}>Clinical Safety Notice:</strong> These alerts indicate{' '}
          <em>potential red flags detected by a deterministic rules engine</em> — not diagnoses.
          All require assessment by a qualified clinician. Suggested actions are advisory only.
        </div>
      </main>

      <style>{`
        @keyframes emergencyPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217,48,37,0); }
          50%       { box-shadow: 0 0 0 4px rgba(217,48,37,0.12); }
        }
        .badge-emergency     { background:rgba(217,48,37,0.15); border:1px solid rgba(217,48,37,0.4); color:#FF6B6B; font-size:0.72rem; font-weight:700; padding:0.25rem 0.75rem; border-radius:999px; }
        .badge-high-priority { background:rgba(250,123,23,0.12); border:1px solid rgba(250,123,23,0.35); color:#FFA552; font-size:0.72rem; font-weight:700; padding:0.25rem 0.75rem; border-radius:999px; }
        .badge-warning       { background:rgba(255,213,79,0.1); border:1px solid rgba(255,213,79,0.3); color:#FFD54F; font-size:0.72rem; font-weight:700; padding:0.25rem 0.75rem; border-radius:999px; }
        .badge-normal        { background:rgba(105,240,174,0.08); border:1px solid rgba(105,240,174,0.25); color:#69F0AE; font-size:0.72rem; font-weight:700; padding:0.25rem 0.75rem; border-radius:999px; }
      `}</style>
    </div>
  );
}
