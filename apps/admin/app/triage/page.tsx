'use client';
import '../globals.css';
import './triage.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAdminUser, type AdminUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { TriageAlert, RiskLevel, AlertStatus, RedFlag } from '@medikiosk/shared-types';

// ─── Badge helpers ────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { cls: string; label: string; pulse: boolean }> = {
  EMERGENCY:     { cls: 'badge-emergency',    label: '🚨 Emergency',    pulse: true  },
  HIGH_PRIORITY: { cls: 'badge-high-priority',label: '⚠️ High Priority', pulse: true  },
  WARNING:       { cls: 'badge-warning',      label: '⚡ Warning',      pulse: false },
  NORMAL:        { cls: 'badge-normal',       label: '✅ Normal',       pulse: false },
};

const STATUS_CONFIG: Record<AlertStatus, { cls: string; label: string }> = {
  ACTIVE:        { cls: 'status-active',        label: 'Active'       },
  ACKNOWLEDGED:  { cls: 'status-acknowledged',  label: 'Acknowledged' },
  ESCALATED:     { cls: 'status-escalated',     label: 'Escalated'    },
  RESOLVED:      { cls: 'status-resolved',      label: 'Resolved'     },
};

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminTriageDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [alerts, setAlerts] = useState<TriageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'ALL'>('ALL');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'ALL'>('ALL');
  const [newAlertCount, setNewAlertCount] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);

  // ── Auth ────────────────────────────────────────────────────────────────────
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

  // ── Subtle alert sound ──────────────────────────────────────────────────────
  const playAlertTone = useCallback(() => {
    try {
      const ctx = audioRef.current ?? (audioRef.current = new AudioContext());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext not available (SSR or restricted)
    }
  }, []);

  // ── Initial fetch via Express API ────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus !== 'ALL') params.set('alert_status', filterStatus);
    if (filterRisk !== 'ALL') params.set('risk_level', filterRisk);
    params.set('limit', '100');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/triage/alerts?${params}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
          },
        }
      );
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setAlerts(json.data as TriageAlert[]);
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterRisk]);

  useEffect(() => {
    if (!authChecked) return;
    fetchAlerts();
  }, [authChecked, fetchAlerts]);

  // ── Supabase Realtime subscription ──────────────────────────────────────────
  // Uses the anon key (RLS enforced). ADMIN role sees all rows per RLS policy.
  useEffect(() => {
    if (!authChecked) return;

    const channel = supabase
      .channel('admin-triage-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage_alerts',
        },
        (payload) => {
          const incoming = payload.new as TriageAlert | undefined;
          const old = payload.old as TriageAlert | undefined;

          if (payload.eventType === 'INSERT' && incoming) {
            setAlerts((prev) => {
              // Guard against duplicate delivery
              if (prev.some((a) => a.id === incoming.id)) return prev;
              // New emergency/high-priority: play tone and increment counter
              if (['EMERGENCY', 'HIGH_PRIORITY'].includes(incoming.riskLevel ?? '')) {
                playAlertTone();
                setNewAlertCount((c) => c + 1);
              }
              // Insert at the top (already sorted by priority_score on the DB side,
              // but optimistically place new alerts first)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authChecked, playAlertTone]);

  // ── Action helpers ──────────────────────────────────────────────────────────
  const getToken = async () =>
    (await supabase.auth.getSession()).data.session?.access_token ?? '';

  const apiAction = async (
    alertId: string,
    endpoint: string,
    body: Record<string, string>
  ) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/triage/alerts/${alertId}/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify(body),
      }
    );
    return res.json();
  };

  const handleAcknowledge = async (alertId: string) => {
    await apiAction(alertId, 'acknowledge', {});
    // Realtime UPDATE event will refresh the UI automatically
  };

  const handleResolve = async (alertId: string) => {
    const notes = prompt('Resolution notes (required):');
    if (!notes?.trim()) return;
    await apiAction(alertId, 'resolve', { resolution_notes: notes });
  };

  const handleEscalate = async (alertId: string) => {
    const notes = prompt('Escalation notes (required):');
    if (!notes?.trim()) return;
    await apiAction(alertId, 'escalate', { escalation_notes: notes });
  };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus !== 'ALL' && a.alertStatus !== filterStatus) return false;
    if (filterRisk !== 'ALL' && a.riskLevel !== filterRisk) return false;
    return true;
  });

  const emergencyCount = alerts.filter(
    (a) => a.riskLevel === 'EMERGENCY' && a.alertStatus === 'ACTIVE'
  ).length;
  const activeCount = alerts.filter((a) => a.alertStatus === 'ACTIVE').length;

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F1117' }}>
        <div className="page-spinner" aria-label="Authenticating…" />
      </div>
    );
  }

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
          <span className="admin-topnav-badge">Triage Dashboard</span>
        </div>
        <div className="admin-topnav-right">
          {newAlertCount > 0 && (
            <button
              className="triage-new-badge"
              onClick={() => setNewAlertCount(0)}
              aria-label={`${newAlertCount} new alerts since page load`}
            >
              {newAlertCount} new
            </button>
          )}
          <a href="/" className="admin-topnav-link">← Dashboard</a>
          <div className="admin-topnav-divider" />
          <span className="triage-realtime-indicator" aria-label="Realtime active">
            <span className="admin-status-dot" />
            Live
          </span>
        </div>
      </header>

      <main className="admin-main">
        {/* Hero */}
        <div className="admin-hero fade-in">
          <div>
            <h1 className="admin-hero-title">Triage Alerts</h1>
            <p className="admin-hero-sub">
              Real-time alerts from deterministic red-flag detection.{' '}
              <strong>Potential red flags detected</strong> — not diagnoses.
              All alerts require clinical assessment.
            </p>
          </div>
          <div className="triage-stats-row">
            <div className="triage-stat triage-stat-emergency">
              <span className="triage-stat-value">{emergencyCount}</span>
              <span className="triage-stat-label">Emergency</span>
            </div>
            <div className="triage-stat triage-stat-active">
              <span className="triage-stat-value">{activeCount}</span>
              <span className="triage-stat-label">Active</span>
            </div>
            <div className="triage-stat">
              <span className="triage-stat-value">{alerts.length}</span>
              <span className="triage-stat-label">Total</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="triage-filters fade-in">
          <div className="triage-filter-group">
            <label className="triage-filter-label" htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              className="triage-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'ALL')}
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <div className="triage-filter-group">
            <label className="triage-filter-label" htmlFor="filter-risk">Risk</label>
            <select
              id="filter-risk"
              className="triage-filter-select"
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as RiskLevel | 'ALL')}
            >
              <option value="ALL">All</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="HIGH_PRIORITY">High Priority</option>
              <option value="WARNING">Warning</option>
            </select>
          </div>
          <button
            id="triage-refresh-btn"
            className="triage-refresh-btn"
            onClick={fetchAlerts}
            aria-label="Refresh alerts"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Alerts list */}
        {loading ? (
          <div className="triage-loading"><div className="page-spinner" /></div>
        ) : filteredAlerts.length === 0 ? (
          <div className="triage-empty fade-in">
            <span style={{ fontSize: '3rem' }}>✅</span>
            <p>No triage alerts match the selected filters.</p>
          </div>
        ) : (
          <div className="triage-alert-list fade-in">
            {filteredAlerts.map((alert) => {
              const risk = RISK_CONFIG[alert.riskLevel] ?? RISK_CONFIG.NORMAL;
              const status = STATUS_CONFIG[alert.alertStatus] ?? STATUS_CONFIG.ACTIVE;
              const canAck = alert.alertStatus === 'ACTIVE';
              const canAct = alert.alertStatus !== 'RESOLVED';

              return (
                <div
                  key={alert.id}
                  className={`triage-alert-card ${alert.riskLevel === 'EMERGENCY' ? 'triage-alert-card--emergency' : ''} ${alert.riskLevel === 'HIGH_PRIORITY' ? 'triage-alert-card--high' : ''}`}
                >
                  {/* Left accent bar */}
                  <div className={`triage-alert-accent triage-alert-accent--${alert.riskLevel.toLowerCase().replace('_', '-')}`} />

                  <div className="triage-alert-body">
                    {/* Header row */}
                    <div className="triage-alert-header">
                      <div className="triage-alert-badges">
                        <span className={`triage-badge ${risk.cls} ${risk.pulse ? 'triage-badge--pulse' : ''}`}>
                          {risk.label}
                        </span>
                        <span className={`triage-badge-status ${status.cls}`}>
                          {status.label}
                        </span>
                        {alert.clinicalCategory && (
                          <span className="triage-category-tag">{alert.clinicalCategory}</span>
                        )}
                      </div>
                      <span className="triage-alert-time">{timeAgo(alert.createdAt)}</span>
                    </div>

                    {/* Patient info */}
                    {alert.patient && (
                      <div className="triage-patient-info">
                        <span className="triage-patient-name">
                          {alert.patient.firstName} {alert.patient.lastName}
                        </span>
                        {alert.patient.age && (
                          <span className="triage-patient-meta"> · {alert.patient.age}y</span>
                        )}
                        {alert.patient.gender && (
                          <span className="triage-patient-meta"> · {alert.patient.gender}</span>
                        )}
                      </div>
                    )}

                    {/* Suggested action — protocol-neutral */}
                    {alert.suggestedAction && (
                      <div className="triage-action-block">
                        <span className="triage-action-label">Suggested action</span>
                        <span className="triage-action-text">{alert.suggestedAction}</span>
                      </div>
                    )}

                    {/* Red flags */}
                    {alert.redFlags?.length > 0 && (
                      <div className="triage-flags">
                        {alert.redFlags.map((f: RedFlag, i: number) => (
                          <div key={i} className="triage-flag-item">
                            <span className="triage-flag-desc">{f.description}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Time to intervention */}
                    {alert.timeToInterventionMinutes && canAct && (
                      <div className="triage-tti">
                        ⏱ Recommended intervention within{' '}
                        <strong>{alert.timeToInterventionMinutes} min</strong>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="triage-actions">
                      {canAck && (
                        <button
                          id={`ack-${alert.id}`}
                          className="triage-btn triage-btn-ack"
                          onClick={() => handleAcknowledge(alert.id)}
                          aria-label={`Acknowledge alert ${alert.id}`}
                        >
                          ✓ Acknowledge
                        </button>
                      )}
                      {canAct && (
                        <>
                          <button
                            id={`resolve-${alert.id}`}
                            className="triage-btn triage-btn-resolve"
                            onClick={() => handleResolve(alert.id)}
                            aria-label={`Resolve alert ${alert.id}`}
                          >
                            ✔ Resolve
                          </button>
                          <button
                            id={`escalate-${alert.id}`}
                            className="triage-btn triage-btn-escalate"
                            onClick={() => handleEscalate(alert.id)}
                            aria-label={`Escalate alert ${alert.id}`}
                          >
                            ↑ Escalate
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="triage-disclaimer fade-in">
          🔒 <strong>Clinical Safety Notice:</strong> These alerts indicate{' '}
          <em>potential red flags detected by a deterministic rules engine</em>, not diagnoses.
          All alerts require assessment by a qualified clinical professional.
          Suggested actions follow hospital protocols and are advisory only.
        </div>
      </main>
    </div>
  );
}
