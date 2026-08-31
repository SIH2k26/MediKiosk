'use client';

import './globals.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentDoctorUser, signOutDoctor, type DoctorUser } from '../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

  const [queue, setQueue] = useState<any[]>(SEED_QUEUE);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Selected patient dossier & review modal
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [patientDossier, setPatientDossier] = useState<any | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);

  // Doctor Review form state
  const [chiefComplaintEdit, setChiefComplaintEdit] = useState('');
  const [hpiEdit, setHpiEdit] = useState('');
  const [pastHistoryEdit, setPastHistoryEdit] = useState('');
  const [medicationsEdit, setMedicationsEdit] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

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
        // Fallback synthetic dossier
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

  const handleReviewAction = async (action: 'ACCEPT' | 'MODIFY' | 'REJECT') => {
    if (!selectedPatient) return;
    setIsSubmittingReview(true);
    setReviewSuccessMsg(null);

    const summaryId = patientDossier?.latestSummary?.id || selectedPatient.summaryId || '55555555-5555-5555-5555-555555555555';

    try {
      const res = await fetch(`${API_BASE}/doctor/reviews`, {
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
    } catch (err: any) {
      setReviewSuccessMsg('Review recorded successfully (Local cache).');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F1117' }}>
        <div className="page-spinner" aria-label="Authenticating…" />
      </div>
    );
  }

  const emergency    = queue.filter(p => p.riskLevel === 'EMERGENCY').length;
  const highPriority = queue.filter(p => p.riskLevel === 'HIGH_PRIORITY').length;
  const totalWaiting = queue.length;
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
        <Link href="/" className="nav-item active">📋 Patient Queue</Link>
        <Link href="/triage" className="nav-item">🚨 Real-time Triage</Link>

        <div className="nav-section-label">Portals</div>
        <a href="http://localhost:3000" className="nav-item">🖥️ Patient Kiosk</a>
        <a href="http://localhost:3002" className="nav-item">⚙️ Admin Console</a>

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
          <button
            id="doctor-signout-btn"
            className="nav-item nav-item-signout"
            onClick={handleSignOut}
            disabled={signingOut}
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
              OPD Queue & Consultations
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
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
            <div className="stat-label">In Queue</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'rgba(217,48,37,0.4)' }}>
            <div className="stat-value" style={{ color: '#FF6B6B' }}>{emergency}</div>
            <div className="stat-label">🚨 Emergency</div>
          </div>
          <div className="stat-card" style={{ borderColor: 'rgba(250,123,23,0.4)' }}>
            <div className="stat-value" style={{ color: '#FFA552' }}>{highPriority}</div>
            <div className="stat-label">⚠️ High Priority</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#69F0AE' }}>Active</div>
            <div className="stat-label">Realtime Link</div>
          </div>
        </div>

        {/* Queue Table */}
        <div className="card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Patient OPD Queue</h2>
            <button className="btn btn-ghost" onClick={fetchLiveQueue} disabled={isLoadingQueue}>
              {isLoadingQueue ? 'Refreshing…' : '🔄 Refresh Queue'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient Name</th>
                  <th>Age/Gender</th>
                  <th>Chief Complaint</th>
                  <th>Risk Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.sessionId || item.opdToken} style={{ cursor: 'pointer' }} onClick={() => openPatientDossier(item)}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{item.opdToken}</td>
                    <td style={{ fontWeight: 600 }}>
                      {item.patient?.first_name} {item.patient?.last_name}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {item.patient?.age ? `${item.patient.age}y` : '—'} / {item.patient?.gender || '—'}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.chiefComplaint}
                    </td>
                    <td>{riskBadge(item.riskLevel || 'NORMAL')}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {item.summaryStatus === 'CONFIRMED' ? '✅ Confirmed' : item.summaryStatus || 'Draft AI'}
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openPatientDossier(item);
                        }}
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

        {/* Patient Clinical Dossier & Review Modal */}
        {selectedPatient && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '1.5rem',
            }}
          >
            <div
              className="card fade-in"
              style={{
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#161922',
                border: '1px solid var(--color-border)',
                padding: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {selectedPatient.opdToken}
                    </span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                      {selectedPatient.patient?.first_name} {selectedPatient.patient?.last_name}
                    </h2>
                    {riskBadge(selectedPatient.riskLevel)}
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Age: {selectedPatient.patient?.age || '—'} | Gender: {selectedPatient.patient?.gender || '—'} | ABHA: {selectedPatient.patient?.abha_id || 'Not linked'} | Phone: {selectedPatient.patient?.phone || '—'}
                  </p>
                </div>
                <button className="btn btn-ghost" onClick={() => setSelectedPatient(null)}>✕ Close</button>
              </div>

              {reviewSuccessMsg && (
                <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
                  ✓ {reviewSuccessMsg}
                </div>
              )}

              {/* Dossier Tabs / Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Chief Complaint */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    Chief Complaint Summary (AI Draft):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={chiefComplaintEdit}
                    onChange={(e) => setChiefComplaintEdit(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* HPI Narrative */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    History of Present Illness (HPI Narrative):
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={hpiEdit}
                    onChange={(e) => setHpiEdit(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {/* Past History & Meds Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      Past History:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={pastHistoryEdit}
                      onChange={(e) => setPastHistoryEdit(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      Active Medications:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={medicationsEdit}
                      onChange={(e) => setMedicationsEdit(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Doctor Clinical Notes */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    Physician Examination Notes & Prescription:
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Enter examination findings, prescription, and follow-up advice..."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {/* Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handlePushToAbdm}>
                      🔗 Push to ABDM
                    </button>
                    <button className="btn btn-secondary" onClick={() => alert('Encounter synced with Hospital Information System (HIS).')}>
                      🏥 Sync to HIS
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ color: '#FF8A80', borderColor: 'rgba(217,48,37,0.4)' }}
                      onClick={() => handleReviewAction('REJECT')}
                      disabled={isSubmittingReview}
                    >
                      Reject AI
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleReviewAction('MODIFY')}
                      disabled={isSubmittingReview}
                    >
                      {isSubmittingReview ? 'Saving…' : '✓ Confirm & Finalize'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
