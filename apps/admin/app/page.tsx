import './globals.css';

export default function AdminPage() {
  return (
    <main style={{ padding: '4rem 2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        MediKiosk — Admin Panel
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
        System administration • Phase 1 scaffold
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { icon: '👥', title: 'User Management', desc: 'Manage doctors, triage staff, and admins', phase: 2 },
          { icon: '🖥️', title: 'Kiosk Management', desc: 'Configure physical kiosk devices', phase: 2 },
          { icon: '📋', title: 'Audit Logs',       desc: 'View all system actions and events', phase: 2 },
          { icon: '🌍', title: 'Language Config',  desc: 'Manage supported languages and translations', phase: 2 },
          { icon: '❓', title: 'Questionnaire',    desc: 'Configure clinical history questionnaires', phase: 3 },
          { icon: '📊', title: 'Analytics',        desc: 'OPD volume and system performance', phase: 8 },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '1rem',
              padding: '1.5rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{item.icon}</div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>{item.title}</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>{item.desc}</p>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem',
              background: 'rgba(26,115,232,0.15)', color: '#6BA3FF',
              borderRadius: '999px', border: '1px solid rgba(26,115,232,0.3)',
            }}>
              Phase {item.phase}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
