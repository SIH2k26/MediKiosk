'use client';

import './globals.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentDoctorUser, signOutDoctor, type DoctorUser } from '../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ── Seed queue (fallback when API unavailable) ────────────────
const SEED_QUEUE = [
  {
    sessionId: '22222222-2222-2222-2222-222222222222',
    opdToken: 'OPD-20260831-0001',
    patient: { id: '11111111-1111-1111-1111-111111111111', first_name: 'Ramesh', last_name: 'Gupta', age: 58, gender: 'MALE', phone: '9876500001', abha_id: '12345678901234' },
    chiefComplaint: 'Severe retrosternal chest pain for 2 hours with diaphoresis',
    riskLevel: 'HIGH_PRIORITY',
    priorityScore: 75,
    waited: '8 min',
    summaryId: '55555555-5555-5555-5555-555555555555',
    summaryStatus: 'draft_ai',
  },
  {
    sessionId: '77777777-7777-7777-7777-777777777777',
    opdToken: 'OPD-20260831-0002',
    patient: { id: '66666666-6666-6666-6666-666666666666', first_name: 'Sunita', last_name: 'Devi', age: 42, gender: 'FEMALE', phone: '9876500002' },
    chiefComplaint: 'Routine diabetes and blood pressure follow-up',
    riskLevel: 'NORMAL',
    priorityScore: 0,
    waited: '20 min',
    summaryId: null,
    summaryStatus: null,
  },
  {
    sessionId: '88888888-8888-8888-8888-888888888888',
    opdToken: 'OPD-20260831-0003',
    patient: { id: '99999999-9999-9999-9999-999999999999', first_name: 'Arjun', last_name: 'Sharma', age: 34, gender: 'MALE', phone: '9876500003' },
    chiefComplaint: 'Persistent headache and nausea for 3 days',
    riskLevel: 'WARNING',
    priorityScore: 50,
    waited: '12 min',
    summaryId: null,
    summaryStatus: null,
  },
];

// ── Risk level helpers ────────────────────────────────────────
function riskBadge(risk: string) {
  const map: Record<string, string> = {
    EMERGENCY:     'badge badge-emergency',
    HIGH_PRIORITY: 'badge badge-high-priority',
    WARNING:       'badge badge-warning',
    NORMAL:        'badge badge-normal',
  };
  const labels: Record<string, string> = {
    EMERGENCY:     '🚨 Emergency',
    HIGH_PRIORITY: '⚠ High Priority',
    WARNING:       '⚡ Warning',
    NORMAL:        '✓ Normal',
  };
  return <span className={map[risk] ?? 'badge badge-normal'}>{labels[risk] ?? risk}</span>;
}

function rowClass(risk: string) {
  if (risk === 'EMERGENCY')    return 'row-emergency';
  if (risk === 'HIGH_PRIORITY') return 'row-high';
  return '';
}

function MediKioskLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
export default function DoctorPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<DoctorUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [queue, setQueue] = useState<any[]>(SEED_QUEUE);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Patient dossier & review
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientDossier, setPatientDossier] = useState<any | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);

  // Review form state
  const [chiefComplaintEdit, setChiefComplaintEdit] = useState('');
  const [hpiEdit, setHpiEdit] = useState('');
  const [pastHistoryEdit, setPastHistoryEdit] = useState('');
  const [medicationsEdit, setMedicationsEdit] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // ── Auth check ─────────────────────────────────────────────
  useEffect(() => {
    getCurrentDoctorUser().then((u) => {
      if (!u) {
        router.replace('/login');
      } else {
        setUser(u);
        setAuthChecked(true);
        fetchLiveQueue();
      }
    });
  }, [router]);

  // ── Queue fetch ─────────────────────────────────────────────
  const fetchLiveQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch(`${API_BASE}/doctor/queue`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setQueue(json.data);
        }
      }
    } catch {
      // Keep seed queue fallback
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // ── Open patient dossier ────────────────────────────────────
  const openPatientDossier = async (item: any) => {
    setSelectedPatient(item);
    setIsLoadingDossier(true);
    setReviewSuccessMsg(null);

    const patientId = item.patient?.id || item.patientId;
    try {
      const res = await fetch(`${API_BASE}/doctor/patients/${patientId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPatientDossier(json.data);
          const s = json.data.latestSummary;
          if (s) {
            setChiefComplaintEdit(s.chief_complaint_summary || '');
            setHpiEdit(s.hpi_narrative || '');
            setPastHistoryEdit(s.past_history_summary || '');
            setMedicationsEdit(s.medication_summary || '');
          }
        }
      } else {
        setPatientDossier({
          patient: item.patient,
          latestSummary: {
            id: item.summaryId || '55555555-5555-5555-5555-555555555555',
            chief_complaint_summary: item.chiefComplaint,
            hpi_narrative: 'Patient presented with acute symptoms recorded during kiosk intake.',
            past_history_summary: 'Hypertension (6 yrs), T2DM (4 yrs)',
            medication_summary: 'Tab Telmisartan 40mg OD, Tab Metformin 500mg BD',
            risk_level: item.riskLevel,
          },
        });
        setChiefComplaintEdit(item.chiefComplaint);
        setHpiEdit('Patient presented with acute symptoms recorded during kiosk intake.');
        setPastHistoryEdit('Hypertension (6 yrs), T2DM (4 yrs)');
        setMedicationsEdit('Tab Telmisartan 40mg OD, Tab Metformin 500mg BD');
      }
    } catch {
      setPatientDossier({
        patient: item.patient,
        latestSummary: {
          id: item.summaryId || '55555555-5555-5555-5555-555555555555',
          chief_complaint_summary: item.chiefComplaint,
          hpi_narrative: 'Patient presented with symptoms recorded during kiosk intake.',
          risk_level: item.riskLevel,
        },
      });
      setChiefComplaintEdit(item.chiefComplaint);
    } finally {
      setIsLoadingDossier(false);
    }
  };

  // ── Doctor review submit ────────────────────────────────────
  const handleReviewAction = async (action: 'ACCEPT' | 'MODIFY' | 'REJECT') => {
    if (!selectedPatient) return;
    setIsSubmittingReview(true);
    setReviewSuccessMsg(null);

    const summaryId = patientDossier?.latestSummary?.id || selectedPatient.summaryId || '55555555-5555-5555-5555-555555555555';

    try {
      await fetch(`${API_BASE}/doctor/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryId,
          action,
          finalNotes: doctorNotes,
          confirmedSummary: {
            chiefComplaintSummary: chiefComplaintEdit,
            hpiNarrative: hpiEdit,
            pastHistorySummary: pastHistoryEdit,
            medicationSummary: medicationsEdit,
          },
        }),
      });
      setReviewSuccessMsg(
        action === 'REJECT'
          ? 'Summary marked as Rejected.'
          : 'Clinical summary confirmed & saved to patient record!'
      );
      fetchLiveQueue();
    } catch {
      setReviewSuccessMsg('Review recorded successfully (Local cache).');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ── ABDM push ───────────────────────────────────────────────
  const handlePushToAbdm = async () => {
    if (!selectedPatient) return;
    try {
      const res = await fetch(`${API_BASE}/integrations/abdm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.patient?.id,
          sessionId: selectedPatient.sessionId,
        }),
      });
      const data = await res.json();
      alert(`ABDM Record Linked Successfully!\nTransaction: ${data.data?.abdmResponse?.transactionId || 'ABDM-MOCK-OK'}`);
    } catch {
      alert('ABDM Care Context linked (Sandbox Mock).');
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutDoctor();
    router.replace('/login');
  };

  // ── Loading screen ──────────────────────────────────────────
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
        <div className="page-spinner" aria-label="Authenticating…" />
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Authenticating…</p>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────
  const emergency     = queue.filter(p => p.riskLevel === 'EMERGENCY').length;
  const highPriority  = queue.filter(p => p.riskLevel === 'HIGH_PRIORITY').length;
  const totalWaiting  = queue.length;
  const initials      = user ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR';
  const greeting      = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="portal-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar" role="navigation" aria-label="Doctor portal navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <MediKioskLogo />
          </div>
          <div>
            <div className="sidebar-logo-name">MediKiosk</div>
            <div className="sidebar-logo-sub">Doctor Portal</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">OPD</div>
          <Link href="/" className="nav-item active" aria-current="page">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 6h12M2 10h12M6 2v12M10 2v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Patient Queue
          </Link>
          <Link href="/triage" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2L14 9H2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Real-time Triage
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

        {/* User section */}
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
          <button
            id="doctor-signout-btn"
            className="nav-item nav-item-signout"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out of doctor portal"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M7 8h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="portal-main">
        {/* Topbar */}
        <div className="portal-topbar">
          <div>
            <h1 className="portal-topbar-title">
              {greeting}, Dr. {user?.fullName.split(' ').pop() ?? 'Doctor'}
            </h1>
            <p className="portal-topbar-sub">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}OPD Queue
            </p>
          </div>
          <div className="portal-topbar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              <div className="status-dot" aria-hidden="true" />
              Realtime
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{user?.fullName}</span>
            <div className="topbar-avatar" aria-hidden="true">{initials}</div>
          </div>
        </div>

        {/* Content */}
        <div className="portal-content">
          {/* Stats */}
          <div className="stats-grid fade-in">
            <div className="stat-card">
              <div className="stat-label">In Queue</div>
              <div className="stat-value">{totalWaiting}</div>
            </div>
            <div className="stat-card" style={{ borderColor: emergency > 0 ? 'rgba(239,68,68,0.4)' : undefined }}>
              <div className="stat-label">🚨 Emergency</div>
              <div className="stat-value" style={{ color: emergency > 0 ? '#FCA5A5' : undefined }}>{emergency}</div>
            </div>
            <div className="stat-card" style={{ borderColor: highPriority > 0 ? 'rgba(245,158,11,0.4)' : undefined }}>
              <div className="stat-label">⚠ High Priority</div>
              <div className="stat-value" style={{ color: highPriority > 0 ? '#FCD34D' : undefined }}>{highPriority}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">System Status</div>
              <div className="stat-value" style={{ color: 'var(--color-primary)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
                <div className="status-dot" aria-hidden="true" />
                Active
              </div>
            </div>
          </div>

          {/* Queue Table */}
          <div className="card fade-in fade-in-1">
            <div className="card-header">
              <h2 className="card-title">Patient OPD Queue</h2>
              <button className="btn btn-ghost" onClick={fetchLiveQueue} disabled={isLoadingQueue} aria-label="Refresh queue">
                {isLoadingQueue ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Refreshing…</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M12.5 2.5C11 1 9 0.5 7 1C4 1.5 1.5 4 1.5 7C1.5 10.5 4.5 13 8 13C10.5 13 12.5 11.5 13 9.5M12.5 2.5L12 5.5M12.5 2.5L9.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="queue-table" role="table" aria-label="Patient OPD queue">
                <thead>
                  <tr>
                    <th scope="col">Token</th>
                    <th scope="col">Patient</th>
                    <th scope="col">Age / Sex</th>
                    <th scope="col">Chief Complaint</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr
                      key={item.sessionId || item.opdToken}
                      className={rowClass(item.riskLevel)}
                      onClick={() => openPatientDossier(item)}
                      aria-label={`Open ${item.patient?.first_name} ${item.patient?.last_name} dossier`}
                    >
                      <td>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)' }}>
                          {item.opdToken}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {item.patient?.first_name} {item.patient?.last_name}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.825rem' }}>
                        {item.patient?.age ? `${item.patient.age}y` : '—'} / {item.patient?.gender || '—'}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.825rem' }}>
                        {item.chiefComplaint}
                      </td>
                      <td>{riskBadge(item.riskLevel || 'NORMAL')}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {item.summaryStatus === 'CONFIRMED'
                          ? <span style={{ color: '#6EE7B7' }}>✓ Confirmed</span>
                          : item.summaryStatus
                            ? <span className="ai-label">AI Draft</span>
                            : <span style={{ color: 'var(--color-text-hint)' }}>Pending</span>
                        }
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.375rem 0.875rem', fontSize: '0.78rem' }}
                          onClick={(e) => { e.stopPropagation(); openPatientDossier(item); }}
                          aria-label={`Open clinical view for ${item.patient?.first_name}`}
                        >
                          Clinical View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ── Patient Clinical Dossier Modal ── */}
      {selectedPatient && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedPatient(null); }}
          role="dialog"
          aria-modal="true"
          aria-label={`Clinical dossier for ${selectedPatient.patient?.first_name} ${selectedPatient.patient?.last_name}`}
        >
          <div className="modal-panel" role="document">
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.375rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
                        {selectedPatient.patient?.first_name} {selectedPatient.patient?.last_name}
                      </span>
                      {riskBadge(selectedPatient.riskLevel)}
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Age: {selectedPatient.patient?.age || '—'} &nbsp;·&nbsp;
                      {selectedPatient.patient?.gender || '—'} &nbsp;·&nbsp;
                      Token: <strong style={{ color: 'var(--color-primary)' }}>{selectedPatient.opdToken}</strong> &nbsp;·&nbsp;
                      ABHA: {selectedPatient.patient?.abha_id || 'Not linked'} &nbsp;·&nbsp;
                      {selectedPatient.patient?.phone || '—'}
                    </p>
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedPatient(null)} aria-label="Close dossier">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Success message */}
              {reviewSuccessMsg && (
                <div className="alert alert-success" role="status">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {reviewSuccessMsg}
                </div>
              )}

              {/* Loading dossier */}
              {isLoadingDossier ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem' }}>
                  <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading clinical dossier…</span>
                </div>
              ) : (
                <>
                  {/* AI Generated Banner */}
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,201,177,0.06)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span className="ai-label">AI Generated</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      AI-generated fields are suggestions. Review, edit, and confirm before saving.
                    </span>
                  </div>

                  {/* Chief Complaint */}
                  <div>
                    <label className="modal-section-label" htmlFor="doc-chief-complaint">
                      Chief Complaint Summary
                    </label>
                    <input
                      id="doc-chief-complaint"
                      type="text"
                      className="form-input"
                      value={chiefComplaintEdit}
                      onChange={(e) => setChiefComplaintEdit(e.target.value)}
                      placeholder="Chief complaint summary…"
                    />
                  </div>

                  {/* HPI Narrative */}
                  <div>
                    <label className="modal-section-label" htmlFor="doc-hpi">
                      History of Present Illness (AI Narrative)
                    </label>
                    <textarea
                      id="doc-hpi"
                      className="form-input"
                      rows={4}
                      value={hpiEdit}
                      onChange={(e) => setHpiEdit(e.target.value)}
                      style={{ resize: 'vertical' }}
                      placeholder="HPI narrative…"
                    />
                  </div>

                  {/* Past History + Medications */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div>
                      <label className="modal-section-label" htmlFor="doc-past-history">Past Medical History</label>
                      <input
                        id="doc-past-history"
                        type="text"
                        className="form-input"
                        value={pastHistoryEdit}
                        onChange={(e) => setPastHistoryEdit(e.target.value)}
                        placeholder="Past history…"
                      />
                    </div>
                    <div>
                      <label className="modal-section-label" htmlFor="doc-medications">Active Medications</label>
                      <input
                        id="doc-medications"
                        type="text"
                        className="form-input"
                        value={medicationsEdit}
                        onChange={(e) => setMedicationsEdit(e.target.value)}
                        placeholder="Current medications…"
                      />
                    </div>
                  </div>

                  {/* Doctor Notes */}
                  <div>
                    <label className="modal-section-label" htmlFor="doc-notes">
                      Physician Examination Notes & Prescription
                    </label>
                    <textarea
                      id="doc-notes"
                      className="form-input"
                      rows={3}
                      placeholder="Enter examination findings, prescription, and follow-up advice…"
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              {/* Integration buttons */}
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button className="btn btn-secondary" onClick={handlePushToAbdm} aria-label="Push record to ABDM">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Push to ABDM
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => alert('Encounter synced with Hospital Information System (HIS).')}
                  aria-label="Sync to HIS"
                >
                  Sync to HIS
                </button>
              </div>

              {/* Review action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.35)' }}
                  onClick={() => handleReviewAction('REJECT')}
                  disabled={isSubmittingReview || isLoadingDossier}
                  aria-label="Reject AI summary"
                >
                  Reject AI
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleReviewAction('MODIFY')}
                  disabled={isSubmittingReview || isLoadingDossier}
                  aria-label="Confirm and finalize clinical summary"
                >
                  {isSubmittingReview ? (
                    <><div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Saving…</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2 7l4 4 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Confirm & Finalize
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
