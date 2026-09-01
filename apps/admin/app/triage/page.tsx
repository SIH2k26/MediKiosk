'use client';

import '../globals.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAdminUser, type AdminUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { TriageAlert, RiskLevel, AlertStatus, RedFlag } from '@medikiosk/shared-types';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';

// ─── Badge helpers ────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { severity: "critical" | "warning" | "default"; label: string; pulse: boolean }> = {
  EMERGENCY:     { severity: 'critical', label: '🚨 Emergency',    pulse: true  },
  HIGH_PRIORITY: { severity: 'warning',  label: '⚠️ High Priority', pulse: true  },
  WARNING:       { severity: 'warning',  label: '⚡ Warning',      pulse: false },
  NORMAL:        { severity: 'default',  label: '✅ Normal',       pulse: false },
};

const STATUS_CONFIG: Record<AlertStatus, { cls: string; label: string }> = {
  ACTIVE:        { cls: 'bg-accent-wash text-accent border-accent', label: 'Active' },
  ACKNOWLEDGED:  { cls: 'bg-dark-sunken text-signal-warning border-dark-rule', label: 'Acknowledged' },
  ESCALATED:     { cls: 'bg-dark-sunken text-signal-warning border-signal-warning', label: 'Escalated' },
  RESOLVED:      { cls: 'bg-dark-sunken text-ink-muted border-dark-rule', label: 'Resolved' },
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
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-label="Authenticating…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark">
      {/* Top Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-dark-rule bg-dark-raised">
        <div className="flex items-center gap-3">
          <div className="text-accent" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-ink-primary">MediKiosk</span>
          <span className="px-2 py-1 text-xs font-medium rounded-md bg-accent-wash text-accent">Triage Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          {newAlertCount > 0 && (
            <button
              className="px-3 py-1.5 rounded-full bg-signal-critical text-ink-primary text-xs font-bold animate-pulse"
              onClick={() => setNewAlertCount(0)}
              aria-label={`${newAlertCount} new alerts since page load`}
            >
              {newAlertCount} new
            </button>
          )}
          <a href="/" className="text-sm font-medium text-ink-secondary hover:text-ink-primary transition-colors">← Dashboard</a>
          <div className="w-px h-6 bg-dark-rule" />
          <span className="flex items-center gap-2 text-sm font-medium text-accent" aria-label="Realtime active">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Live
          </span>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Hero */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-ink-primary mb-2">Triage Alerts</h1>
            <p className="text-ink-secondary">
              Real-time alerts from deterministic red-flag detection.{' '}
              <strong className="text-ink-primary">Potential red flags detected</strong> — not diagnoses.
              All alerts require clinical assessment.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded-md bg-dark-raised border border-dark-rule shadow-card min-w-[80px]">
              <span className="text-xl font-bold text-signal-critical">{emergencyCount}</span>
              <span className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Emergency</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded-md bg-dark-raised border border-dark-rule shadow-card min-w-[80px]">
              <span className="text-xl font-bold text-accent">{activeCount}</span>
              <span className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Active</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded-md bg-dark-sunken border border-dark-rule min-w-[80px]">
              <span className="text-xl font-bold text-ink-primary">{alerts.length}</span>
              <span className="text-xs font-medium uppercase tracking-wider text-ink-secondary">Total</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg bg-dark-sunken border border-dark-rule">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary" htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              className="h-10 px-3 py-2 rounded-md bg-dark border border-dark-rule text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary" htmlFor="filter-risk">Risk</label>
            <select
              id="filter-risk"
              className="h-10 px-3 py-2 rounded-md bg-dark border border-dark-rule text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent"
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as RiskLevel | 'ALL')}
            >
              <option value="ALL">All</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="HIGH_PRIORITY">High Priority</option>
              <option value="WARNING">Warning</option>
            </select>
          </div>
          <Button
            id="triage-refresh-btn"
            variant="ghost"
            className="ml-auto text-ink-secondary hover:text-ink-primary"
            onClick={fetchAlerts}
            aria-label="Refresh alerts"
          >
            🔄 Refresh
          </Button>
        </div>

        {/* Alerts list */}
        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-dark-rule bg-dark-sunken">
            <span className="text-4xl mb-4">✅</span>
            <p className="text-ink-secondary font-medium">No triage alerts match the selected filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredAlerts.map((alert) => {
              const risk = RISK_CONFIG[alert.riskLevel] ?? RISK_CONFIG.NORMAL;
              const status = STATUS_CONFIG[alert.alertStatus] ?? STATUS_CONFIG.ACTIVE;
              const canAck = alert.alertStatus === 'ACTIVE';
              const canAct = alert.alertStatus !== 'RESOLVED';

              return (
                <Card 
                  key={alert.id}
                  className="overflow-hidden relative bg-dark-raised border-dark-rule shadow-card rounded-lg"
                >
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    alert.riskLevel === 'EMERGENCY' ? 'bg-signal-critical' :
                    alert.riskLevel === 'HIGH_PRIORITY' ? 'bg-signal-warning' :
                    alert.riskLevel === 'WARNING' ? 'bg-signal-warning' :
                    'bg-accent'
                  }`} />

                  <CardContent className="p-5 pl-7">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={risk.severity} className={risk.pulse ? 'animate-pulse' : ''}>
                          {risk.label}
                        </SeverityBadge>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${status.cls}`}>
                          {status.label}
                        </span>
                        {alert.clinicalCategory && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-dark-sunken border border-dark-rule text-ink-tertiary">
                            {alert.clinicalCategory}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-ink-muted whitespace-nowrap">{timeAgo(alert.createdAt)}</span>
                    </div>

                    {/* Patient info */}
                    {alert.patient && (
                      <div className="mb-4">
                        <span className="font-bold text-ink-primary text-lg">
                          {alert.patient.firstName} {alert.patient.lastName}
                        </span>
                        {alert.patient.age && (
                          <span className="text-ink-secondary ml-2">· {alert.patient.age}y</span>
                        )}
                        {alert.patient.gender && (
                          <span className="text-ink-secondary ml-2">· {alert.patient.gender}</span>
                        )}
                      </div>
                    )}

                    {/* Suggested action — protocol-neutral */}
                    {alert.suggestedAction && (
                      <div className="mb-4 p-3 rounded-md bg-dark-sunken border border-dark-rule">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-ink-tertiary mb-1">Suggested action</span>
                        <span className="text-sm text-ink-primary font-medium">{alert.suggestedAction}</span>
                      </div>
                    )}

                    {/* Red flags */}
                    {alert.redFlags?.length > 0 && (
                      <div className="flex flex-col gap-2 mb-4">
                        {alert.redFlags.map((f: RedFlag, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-signal-critical mt-0.5 text-sm">🚩</span>
                            <span className="text-sm text-ink-secondary">{f.description}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-dark-rule">
                      {/* Time to intervention */}
                      <div>
                        {alert.timeToInterventionMinutes && canAct && (
                          <div className="text-sm text-ink-secondary flex items-center gap-2">
                            <span>⏱</span> Recommended intervention within{' '}
                            <strong className="text-ink-primary">{alert.timeToInterventionMinutes} min</strong>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {canAck && (
                          <Button
                            id={`ack-${alert.id}`}
                            variant="secondary"
                            onClick={() => handleAcknowledge(alert.id)}
                            aria-label={`Acknowledge alert ${alert.id}`}
                          >
                            ✓ Acknowledge
                          </Button>
                        )}
                        {canAct && (
                          <>
                            <Button
                              id={`resolve-${alert.id}`}
                              variant="default"
                              onClick={() => handleResolve(alert.id)}
                              aria-label={`Resolve alert ${alert.id}`}
                            >
                              ✔ Resolve
                            </Button>
                            <Button
                              id={`escalate-${alert.id}`}
                              variant="destructive"
                              onClick={() => handleEscalate(alert.id)}
                              aria-label={`Escalate alert ${alert.id}`}
                              className="bg-dark-sunken text-signal-warning border border-signal-warning hover:bg-dark-raised"
                            >
                              ↑ Escalate
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-4 rounded-lg bg-dark-sunken border border-dark-rule text-sm text-ink-secondary">
          🔒 <strong className="text-ink-primary">Clinical Safety Notice:</strong> These alerts indicate{' '}
          <em className="text-ink-primary italic">potential red flags detected by a deterministic rules engine</em>, not diagnoses.
          All alerts require assessment by a qualified clinical professional.
          Suggested actions follow hospital protocols and are advisory only.
        </div>
      </main>
    </div>
  );
}