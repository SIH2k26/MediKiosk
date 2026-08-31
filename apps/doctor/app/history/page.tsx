'use client';

import '../globals.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentDoctorUser, signOutDoctor, type DoctorUser } from '../../lib/auth';

interface PastEncounter {
  id: string;
  opdToken: string;
  patientName: string;
  age: number;
  gender: string;
  abhaId?: string;
  uhid: string;
  visitDate: string;
  chiefComplaint: string;
  riskLevel: 'EMERGENCY' | 'HIGH_PRIORITY' | 'WARNING' | 'NORMAL';
  status: 'COMPLETED' | 'CONFIRMED' | 'REJECTED';
  doctorNotes?: string;
  prescriptionsCount: number;
  documentsCount: number;
}

const SEED_HISTORY: PastEncounter[] = [
  {
    id: 'enc-001',
    opdToken: 'OPD-20260831-0001',
    patientName: 'Ramesh Gupta',
    age: 58,
    gender: 'MALE',
    abhaId: '12-3456-7890-1234',
    uhid: 'UHID-2026-9042',
    visitDate: '2026-08-31 10:45 AM',
    chiefComplaint: 'Severe retrosternal chest pain for 2 hours with diaphoresis',
    riskLevel: 'HIGH_PRIORITY',
    status: 'CONFIRMED',
    doctorNotes: 'Admitted for emergency ECG and cardiac enzymes. Nitro drip started.',
    prescriptionsCount: 2,
    documentsCount: 1,
  },
  {
    id: 'enc-002',
    opdToken: 'OPD-20260831-0002',
    patientName: 'Sunita Devi',
    age: 42,
    gender: 'FEMALE',
    abhaId: '98-7654-3210-9876',
    uhid: 'UHID-2026-8812',
    visitDate: '2026-08-31 09:30 AM',
    chiefComplaint: 'Routine diabetes and blood pressure follow-up',
    riskLevel: 'NORMAL',
    status: 'CONFIRMED',
    doctorNotes: 'HbA1c 7.1%. Continued on Metformin and Telmisartan.',
    prescriptionsCount: 3,
    documentsCount: 2,
  },
  {
    id: 'enc-003',
    opdToken: 'OPD-20260830-0014',
    patientName: 'Arjun Sharma',
    age: 34,
    gender: 'MALE',
    uhid: 'UHID-2026-7421',
    visitDate: '2026-08-30 04:15 PM',
    chiefComplaint: 'Persistent migraine with photophobia and nausea for 3 days',
    riskLevel: 'WARNING',
    status: 'COMPLETED',
    doctorNotes: 'Prescribed Sumatriptan and Domperidone. Advised sleep hygiene.',
    prescriptionsCount: 2,
    documentsCount: 0,
  },
  {
    id: 'enc-004',
    opdToken: 'OPD-20260830-0008',
    patientName: 'Kavita Verma',
    age: 29,
    gender: 'FEMALE',
    abhaId: '54-1234-9876-0001',
    uhid: 'UHID-2026-6510',
    visitDate: '2026-08-30 11:20 AM',
    chiefComplaint: 'High fever and productive cough for 4 days',
    riskLevel: 'NORMAL',
    status: 'CONFIRMED',
    doctorNotes: 'Chest X-ray shows right lower lobe consolidation. Oral Azithromycin.',
    prescriptionsCount: 3,
    documentsCount: 1,
  },
];

function MediKioskLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function DoctorHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<DoctorUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEncounter, setSelectedEncounter] = useState<PastEncounter | null>(null);

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
    await signOutDoctor();
    router.replace('/login');
  };

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#F0F4F8' }}>
        <p>Authenticating…</p>
      </div>
    );
  }

  const filtered = SEED_HISTORY.filter(
    (h) =>
      h.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.opdToken.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.abhaId && h.abhaId.includes(searchTerm)) ||
      h.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const initials = user ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'DR';

  return (
    <div className="portal-layout">
      {/* ── Sidebar ── */}
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
          <Link href="/triage" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2L14 9H2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Real-time Triage
          </Link>
          <Link href="/history" className="nav-item active" aria-current="page">
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

      {/* ── Main Content ── */}
      <main className="portal-main">
        <div className="portal-topbar">
          <div>
            <h1 className="portal-topbar-title">Patient Encounters & Clinical History</h1>
            <p className="portal-topbar-sub">Search past OPD consultations, verified AI intake summaries, and ABDM care records.</p>
          </div>
          <div className="portal-topbar-right">
            <input
              type="search"
              placeholder="Search by name, UHID, ABHA or complaint…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '320px',
                height: '38px',
                padding: '0 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#F0F4F8',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div className="portal-content">
          <div className="card fade-in">
            <div className="card-header">
              <h2 className="card-title">Completed Consultations ({filtered.length})</h2>
            </div>
            <div className="table-wrapper">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Visit Date</th>
                    <th>OPD Token</th>
                    <th>Patient</th>
                    <th>UHID / ABHA</th>
                    <th>Chief Complaint</th>
                    <th>Triage Level</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontSize: '12px', color: 'rgba(240, 244, 248, 0.5)' }}>{item.visitDate}</td>
                      <td>
                        <span className="token-badge">{item.opdToken}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.patientName}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)' }}>
                          {item.gender} · {item.age} yrs
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                        <div>{item.uhid}</div>
                        {item.abhaId && <div style={{ color: '#00C9B1', fontSize: '10.5px' }}>ABHA: {item.abhaId}</div>}
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ fontSize: '13px', color: 'rgba(240, 244, 248, 0.85)' }}>{item.chiefComplaint}</div>
                        {item.doctorNotes && (
                          <div style={{ fontSize: '11.5px', color: 'rgba(0, 201, 177, 0.8)', marginTop: '2px' }}>
                            👨‍⚕️ {item.doctorNotes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${item.riskLevel.toLowerCase().replace('_', '-')}`}>
                          {item.riskLevel}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 600 }}>
                          ✓ {item.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                          onClick={() => setSelectedEncounter(item)}
                        >
                          View Record
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

      {/* ── Encounter Modal ── */}
      {selectedEncounter && (
        <div className="modal-backdrop" onClick={() => setSelectedEncounter(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
                  Clinical Encounter Record — {selectedEncounter.patientName}
                </h2>
                <p style={{ fontSize: '12px', color: 'rgba(240, 244, 248, 0.5)' }}>
                  {selectedEncounter.opdToken} · {selectedEncounter.visitDate}
                </p>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedEncounter(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#00C9B1', fontWeight: 700, textTransform: 'uppercase' }}>Chief Complaint</div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>{selectedEncounter.chiefComplaint}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#00C9B1', fontWeight: 700, textTransform: 'uppercase' }}>Doctor Consultation Notes</div>
                <div style={{ fontSize: '13.5px', marginTop: '4px' }}>{selectedEncounter.doctorNotes || 'No notes added.'}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '12px' }}>
                  <strong>Prescriptions:</strong> {selectedEncounter.prescriptionsCount} items
                </div>
                <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '12px' }}>
                  <strong>Digitized Documents:</strong> {selectedEncounter.documentsCount} files
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedEncounter(null)}>
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
