'use client';

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
      <div className="flex items-center justify-center min-h-screen bg-dark text-ink-primary">
        <p className="text-xs font-medium text-ink-tertiary">Authenticating…</p>
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
    <div className="flex min-h-screen bg-dark text-ink-primary font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-dark-raised border-r border-dark-rule flex flex-col justify-between shrink-0 p-4 min-h-screen" role="navigation" aria-label="Doctor portal navigation">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-dark-rule">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-accent-wash text-accent shrink-0" aria-hidden="true">
              <MediKioskLogo />
            </div>
            <div>
              <div className="text-sm font-bold text-ink-primary leading-tight">MediKiosk</div>
              <div className="text-xs text-ink-tertiary">Doctor Portal</div>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mt-4 mb-2 px-2">OPD</div>
            <Link href="/" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md text-ink-secondary hover:text-ink-primary hover:bg-dark-sunken transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 6h12M2 10h12M6 2v12M10 2v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Patient Queue
            </Link>
            <Link href="/triage" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md text-ink-secondary hover:text-ink-primary hover:bg-dark-sunken transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2L14 9H2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Real-time Triage
            </Link>
            <Link href="/history" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md bg-accent-wash text-accent" aria-current="page">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v5l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Past Encounters
            </Link>

            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mt-6 mb-2 px-2">Portals</div>
            <a href="http://localhost:3000" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md text-ink-secondary hover:text-ink-primary hover:bg-dark-sunken transition-colors" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 13v2M11 13v2M3 15h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Patient Kiosk
            </a>
            <a href="http://localhost:3002" className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md text-ink-secondary hover:text-ink-primary hover:bg-dark-sunken transition-colors" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              </svg>
              Admin Console
            </a>
          </nav>
        </div>

        <div className="pt-4 border-t border-dark-rule space-y-2">
          {user && (
            <div className="flex items-center gap-3 p-2.5 rounded-md bg-dark-sunken border border-dark-rule">
              <div className="w-7 h-7 rounded bg-accent text-dark font-bold text-xs flex items-center justify-center shrink-0" aria-hidden="true">{initials}</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-ink-primary truncate">{user.fullName}</div>
                <div className="text-[10px] text-ink-tertiary capitalize truncate">{user.role}</div>
              </div>
            </div>
          )}
          <button className="w-full text-left px-3 py-2 text-xs font-medium text-ink-secondary hover:text-signal-critical rounded-md hover:bg-dark-sunken transition-colors" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-dark">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 border-b border-dark-rule bg-dark-raised">
          <div>
            <h1 className="text-xl font-bold text-ink-primary">Patient Encounters & Clinical History</h1>
            <p className="text-xs text-ink-tertiary mt-1">Search past OPD consultations, verified AI intake summaries, and ABDM care records.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search by name, UHID, ABHA or complaint…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-80 px-3 py-2 bg-dark-sunken border border-dark-rule rounded-md text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-dark-ruleStrong transition-colors"
            />
          </div>
        </div>

        <div className="p-6 flex-1 space-y-6">
          <div className="bg-dark-raised border border-dark-rule rounded-lg shadow-card overflow-hidden">
            <div className="p-4 border-b border-dark-rule">
              <h2 className="text-sm font-semibold text-ink-primary">Completed Consultations ({filtered.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-dark-sunken border-b border-dark-rule">
                    <th className="p-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Visit Date</th>
                    <th className="p-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">OPD Token</th>
                    <th className="p-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Patient</th>
                    <th className="p-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">UHID / ABHA</th>
                    <th className="p-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Chief Complaint</th>
                    <th className="p-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Triage Level</th>
                    <th className="p-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Status</th>
                    <th className="p-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-rule">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-dark-sunken transition-colors">
                      <td className="p-3 text-xs text-ink-tertiary whitespace-nowrap align-top">{item.visitDate}</td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-dark-sunken text-ink-primary border border-dark-rule">{item.opdToken}</span>
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-semibold text-ink-primary text-xs">{item.patientName}</div>
                        <div className="text-[11px] text-ink-tertiary">
                          {item.gender} · {item.age} yrs
                        </div>
                      </td>
                      <td className="p-3 align-top font-mono text-xs">
                        <div className="text-ink-secondary">{item.uhid}</div>
                        {item.abhaId && <div className="text-accent text-[10.5px] mt-0.5">ABHA: {item.abhaId}</div>}
                      </td>
                      <td className="p-3 align-top max-w-xs">
                        <div className="text-xs text-ink-primary leading-snug">{item.chiefComplaint}</div>
                        {item.doctorNotes && (
                          <div className="text-[11.5px] text-accent mt-1 leading-snug">
                            👨‍⚕️ {item.doctorNotes}
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-dark-rule ${
                          item.riskLevel === 'EMERGENCY'
                            ? 'text-signal-critical bg-dark-sunken'
                            : item.riskLevel === 'HIGH_PRIORITY' || item.riskLevel === 'WARNING'
                            ? 'text-signal-warning bg-dark-sunken'
                            : 'text-ink-secondary bg-dark-sunken'
                        }`}>
                          {item.riskLevel}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="text-[11.5px] text-accent font-semibold inline-flex items-center gap-1">
                          ✓ {item.status}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <button
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-dark-sunken border border-dark-rule text-ink-primary hover:bg-dark-raised hover:border-dark-ruleStrong transition-colors"
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
        <div className="fixed inset-0 z-50 bg-dark/80 flex items-center justify-center p-4" onClick={() => setSelectedEncounter(null)}>
          <div className="w-full max-w-2xl bg-dark-raised border border-dark-rule rounded-lg shadow-raised overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-dark-rule">
              <div>
                <h2 className="text-base font-bold text-ink-primary">
                  Clinical Encounter Record — {selectedEncounter.patientName}
                </h2>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  {selectedEncounter.opdToken} · {selectedEncounter.visitDate}
                </p>
              </div>
              <button className="text-ink-tertiary hover:text-ink-primary p-1 text-sm rounded transition-colors" onClick={() => setSelectedEncounter(null)}>✕</button>
            </div>
            <div className="p-4 space-y-3.5">
              <div className="p-3 rounded-md bg-dark-sunken border border-dark-rule">
                <div className="text-[11px] font-bold text-accent uppercase tracking-wider">Chief Complaint</div>
                <div className="text-sm text-ink-primary mt-1">{selectedEncounter.chiefComplaint}</div>
              </div>
              <div className="p-3 rounded-md bg-dark-sunken border border-dark-rule">
                <div className="text-[11px] font-bold text-accent uppercase tracking-wider">Doctor Consultation Notes</div>
                <div className="text-xs text-ink-primary mt-1 leading-relaxed">{selectedEncounter.doctorNotes || 'No notes added.'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-md bg-dark-sunken border border-dark-rule text-xs text-ink-secondary">
                  <strong className="text-ink-primary">Prescriptions:</strong> {selectedEncounter.prescriptionsCount} items
                </div>
                <div className="p-2.5 rounded-md bg-dark-sunken border border-dark-rule text-xs text-ink-secondary">
                  <strong className="text-ink-primary">Digitized Documents:</strong> {selectedEncounter.documentsCount} files
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-dark-rule flex justify-end">
              <button className="px-4 py-2 text-xs font-semibold rounded-md bg-accent text-dark hover:bg-accent/90 transition-colors" onClick={() => setSelectedEncounter(null)}>
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}