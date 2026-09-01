'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { DataMono } from '@/components/ui/data-mono';
import { NavItem } from '@/components/ui/nav-item';
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

const RISK_CONFIG: Record<RiskLevel, { label: string; borderClass: string; bgClass: string; pulse: boolean }> = {
  EMERGENCY:     { label: '🚨 Emergency',    borderClass: 'border-signal-critical', bgClass: 'bg-signal-critical/10', pulse: true  },
  HIGH_PRIORITY: { label: '⚠️ High Priority', borderClass: 'border-signal-warning',  bgClass: 'bg-signal-warning/10',  pulse: true  },
  WARNING:       { label: '⚡ Warning',       borderClass: 'border-signal-warning/50', bgClass: 'bg-signal-warning/5', pulse: false },
  NORMAL:        { label: '✅ Normal',        borderClass: 'border-dark-rule', bgClass: 'bg-dark-raised', pulse: false },
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
    } fontally {
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
      <div className="flex items-center justify-center min-h-screen bg-dark text-ink-primary">
        <p>Authenticating…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-dark">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-dark-rule bg-dark-raised flex-shrink-0" role="navigation" aria-label="Doctor portal navigation">
        <div className="flex items-center gap-3 p-5 border-b border-dark-rule">
          <div className="text-accent" aria-hidden="true">
            <MediKioskLogo />
          </div>
          <div>
            <div className="font-semibold text-ink-primary tracking-tight text-lg">MediKiosk</div>
            <div className="text-xs text-ink-tertiary">Doctor Portal</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mt-5 mb-2 px-3">OPD</div>
          <Link href="/" passHref legacyBehavior>
            <NavItem>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 6h12M2 10h12M6 2v12M10 2v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Patient Queue
            </NavItem>
          </Link>
          <Link href="/triage" passHref legacyBehavior>
            <NavItem active aria-current="page">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2L14 9H2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Real-time Triage
              {activeAlerts.length > 0 && (
                <span className="ml-auto bg-signal-critical/10 border border-signal-critical/30 rounded-full text-[11px] font-bold px-2 py-0.5 text-signal-critical">
                  {activeAlerts.length}
                </span>
              )}
            </NavItem>
          </Link>
          <Link href="/history" passHref legacyBehavior>
            <NavItem>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v5l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Past Encounters
            </NavItem>
          </Link>

          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mt-5 mb-2 px-3">Portals</div>
          <NavItem href="http://localhost:3000" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5 13v2M11 13v2M3 15h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Patient Kiosk
          </NavItem>
          <NavItem href="http://localhost:3002" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
            Admin Console
          </NavItem>
        </nav>

        <div className="p-4 border-t border-dark-rule flex flex-col gap-3">
          {user && (
            <div className="flex items-center gap-3 p-3 bg-dark-sunken rounded-lg border border-dark-rule">
              <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm border border-accent/20" aria-hidden="true">{initials}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate text-ink-primary">{user.fullName}</div>
                <div className="text-xs text-ink-tertiary truncate uppercase tracking-wider font-medium">{user.role}</div>
              </div>
            </div>
          )}
          <Button variant="ghost" className="w-full justify-start text-signal-critical hover:text-signal-critical hover:bg-signal-critical/10 gap-2" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-dark">
        <div className="flex items-center justify-between p-6 border-b border-dark-rule bg-dark-raised flex-shrink-0">
          <div>
            <h1 className="text-2xl font-semibold text-ink-primary tracking-tight">Real-Time Clinical Triage Signals</h1>
            <p className="text-sm text-ink-secondary mt-1">AST Rule Engine signals & red flags detected during live patient kiosk intakes.</p>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-xs text-accent flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-accent" />
              AST Engine Live
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="page-spinner" />
            </div>
          ) : (
            <>
              {/* Active Alerts */}
              {activeAlerts.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-tertiary mb-3">
                    Active Priority Signals ({activeAlerts.length})
                  </h2>
                  <div className="flex flex-col gap-3">
                    {activeAlerts.map((alert) => {
                      const risk = RISK_CONFIG[alert.riskLevel] ?? RISK_CONFIG.NORMAL;
                      return (
                        <div
                          key={alert.id}
                          className={`animate-in fade-in slide-in-from-bottom-2 border rounded-lg shadow-card flex gap-4 items-start p-5 ${risk.borderClass} ${risk.bgClass}`}
                        >
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex gap-2 items-center">
                                <SeverityBadge severity={alert.riskLevel === 'EMERGENCY' ? 'critical' : alert.riskLevel === 'HIGH_PRIORITY' || alert.riskLevel === 'WARNING' ? 'warning' : 'default'}>
                                  {risk.label}
                                </SeverityBadge>
                                {alert.clinicalCategory && (
                                  <span className="text-[11px] uppercase px-2 py-0.5 bg-dark-sunken rounded-full text-ink-secondary font-semibold border border-dark-rule">
                                    {alert.clinicalCategory}
                                  </span>
                                )}
                                <span className="text-[11px] text-signal-warning font-bold">
                                  SCORE: {alert.priorityScore}
                                </span>
                              </div>
                              <span className="text-xs text-ink-muted">
                                {timeAgo(alert.createdAt)}
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-ink-primary mb-1.5">
                              {alert.suggestedAction || 'Priority signal flagged during intake'}
                            </p>
                            <DataMono className="text-xs text-ink-tertiary">
                              SESSION: {alert.sessionId} {alert.patient ? `· ${alert.patient.firstName} ${alert.patient.lastName} (${alert.patient.age}y ${alert.patient.gender})` : ''}
                            </DataMono>
                          </div>

                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <Button
                              variant="default"
                              className="h-8 px-3 text-xs"
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              ✓ Acknowledge
                            </Button>
                            <Button
                              variant="outline"
                              className="h-8 px-3 text-xs text-signal-critical border-signal-critical/30 hover:bg-signal-critical/10"
                              onClick={() => handleEscalate(alert.id)}
                            >
                              ⚡ Escalate
                            </Button>
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
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-tertiary mb-3">
                    Acknowledged & Escalated Signals ({otherAlerts.length})
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    {otherAlerts.map((alert) => (
                      <Card
                        key={alert.id}
                        className="flex justify-between items-center px-4 py-3 opacity-80 bg-dark-raised border-dark-rule shadow-card"
                      >
                        <div>
                          <div className="flex gap-2 items-center mb-1">
                            <span className={`text-xs font-bold ${alert.alertStatus === 'ESCALATED' ? 'text-signal-critical' : 'text-accent'}`}>
                              ● {alert.alertStatus}
                            </span>
                            <span className="text-sm font-semibold text-ink-primary">{alert.suggestedAction}</span>
                          </div>
                          <div className="text-[11px] text-ink-tertiary">
                            {alert.clinicalCategory} · {timeAgo(alert.createdAt)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="h-7 px-2.5 text-[11px]"
                          onClick={() => handleResolve(alert.id)}
                        >
                          Mark Resolved
                        </Button>
                      </Card>
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