'use client';

import Link from 'next/link';
import './home.css';
import {
  LogoMark,
  Mic,
  Sparkles,
  CheckCircle,
  Clock,
  Globe,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Check,
  Activity,
  Layers,
  Database,
  Cpu,
} from './components/icons';

function MediKioskCrossIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="home-wrapper">
      {/* ── Navigation ── */}
      <header className="nav-bar" role="banner">
        <div className="nav-container">
          <Link href="/" className="nav-logo" aria-label="MediKiosk Home">
            <div className="nav-logo-icon">
              <MediKioskCrossIcon size={16} />
            </div>
            <span className="nav-wordmark">MediKiosk</span>
          </Link>

          <div className="nav-right">
            <nav className="nav-links-group" aria-label="Primary Navigation">
              <a href="#how-it-works" className="nav-link">
                How it works
              </a>
              <a href="#how-it-works" className="nav-link">
                Clinical AI
              </a>
              <a href="#safety" className="nav-link">
                For Doctors
              </a>
              <a
                href="http://localhost:3001"
                className="nav-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Doctor Portal
              </a>
            </nav>

            <Link href="/start" className="btn-nav-primary" id="nav-launch-btn">
              Launch Kiosk →
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ══════════════════════════════════════════════════════
            SECTION 1: HERO (Matches Screenshot Identically)
            ══════════════════════════════════════════════════════ */}
        <section className="home-hero" aria-labelledby="hero-heading">
          <div className="container">
            <div className="home-hero-inner">
              {/* Left Column */}
              <div className="home-hero-content">
                {/* System Status Pill */}
                <div className="home-hero-status" role="status" aria-live="polite">
                  <span className="home-status-dot" aria-hidden="true" />
                  <span>MEDIKIOSK CLINICAL INTELLIGENCE · SYSTEM ONLINE</span>
                </div>

                {/* Eyebrow */}
                <p className="home-hero-eyebrow">
                  SMART INDIA HACKATHON 2026
                </p>

                {/* Main Headline */}
                <h1 id="hero-heading" className="home-hero-title">
                  Healthcare<br />
                  starts with<br />
                  <em>being heard.</em>
                </h1>

                {/* Subhead */}
                <p className="home-hero-sub">
                  MediKiosk turns a patient's voice, touch responses, and medical documents into structured clinical intelligence — before the consultation begins.
                </p>

                {/* Action Buttons */}
                <div className="home-hero-actions">
                  <Link href="/start" className="btn-hero-primary" id="hero-launch-btn">
                    <MediKioskCrossIcon size={18} />
                    <span>Launch Kiosk</span>
                  </Link>
                  <a
                    href="http://localhost:3001"
                    className="btn-hero-secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Doctor View →
                  </a>
                </div>

                {/* Trust Badges Row */}
                <div className="home-trust-badges" aria-label="Credibility and compliance badges">
                  <span className="home-trust-badge">ABHA Compatible</span>
                  <span className="home-trust-badge">FHIR R4</span>
                  <span className="home-trust-badge">10 Indian Languages</span>
                  <span className="home-trust-badge">Open Source</span>
                  <span className="home-trust-badge">SIH 2026</span>
                </div>
              </div>

              {/* Right Column: Clinical Flow Visualization */}
              <div className="home-hero-visual" aria-label="Clinical AI Flow Visualization">
                {/* Center AI Orb */}
                <div className="hero-flow-center">
                  <div className="hero-flow-logo">
                    <MediKioskCrossIcon size={18} />
                  </div>
                  <div className="hero-flow-label">AI</div>
                </div>

                {/* Card 1: Voice (Top-Left) */}
                <div className="hero-flow-card hero-flow-card-voice">
                  <div className="hfc-eyebrow">PATIENT · HINDI</div>
                  <div className="hfc-content">
                    "मुझे सीने में दर्द है<br />दो घंटे से।"
                  </div>
                  <div className="hfc-waveform" aria-hidden="true">
                    {[14, 22, 16, 26, 12, 24, 18, 10].map((h, idx) => (
                      <span
                        key={idx}
                        className="hfc-waveform-bar"
                        style={{
                          height: `${h}px`,
                          animationDelay: `${idx * 120}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="hfc-chip hfc-chip-teal">● Listening</span>
                </div>

                {/* Card 2: Extracted Entities (Middle-Right) */}
                <div className="hero-flow-card hero-flow-card-entity">
                  <div className="hfc-eyebrow">EXTRACTED ENTITIES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    <span className="hfc-chip hfc-chip-teal">Chest Pain</span>
                    <span className="hfc-chip hfc-chip-amber">2 Hours</span>
                    <span className="hfc-chip hfc-chip-red">Severe</span>
                  </div>
                </div>

                {/* Card 3: Triage Signal (Bottom-Left) */}
                <div className="hero-flow-card hero-flow-card-alert">
                  <div className="hfc-eyebrow">TRIAGE SIGNAL</div>
                  <div className="hfc-content" style={{ color: '#FCA5A5' }}>
                    ⚠ RED FLAG
                  </div>
                  <div className="hfc-sub">Acute chest pain · High Priority</div>
                  <span className="hfc-chip hfc-chip-red">PRIORITY 75</span>
                </div>

                {/* Card 4: Doctor Dashboard (Bottom-Right) */}
                <div className="hero-flow-card hero-flow-card-doctor">
                  <div className="hfc-eyebrow">DOCTOR DASHBOARD</div>
                  <div className="hfc-content">Clinical Summary</div>
                  <div className="hfc-sub">Ready before consultation</div>
                  <span className="hfc-chip hfc-chip-green">✓ AI Prepared</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION 2: PROBLEM → SOLUTION
            ══════════════════════════════════════════════════════ */}
        <section id="problem" className="section" aria-labelledby="problem-heading">
          <div className="container">
            <p className="eyebrow">The Problem</p>
            <h2 id="problem-heading" className="section-title">
              A five-minute wait shouldn't cost a doctor five minutes of context.
            </h2>

            <div className="problem-grid">
              {/* Left Column: 40% Simple list */}
              <div className="problem-list">
                <div className="problem-item">
                  <Clock size={20} className="problem-icon" aria-hidden="true" />
                  <div>
                    <h3 className="problem-item-title">Long queues</h3>
                    <p className="problem-item-desc">
                      Patients wait without providing clinical context, forcing doctors to start from scratch every consultation.
                    </p>
                  </div>
                </div>

                <div className="problem-item">
                  <Globe size={20} className="problem-icon" aria-hidden="true" />
                  <div>
                    <h3 className="problem-item-title">Language barriers</h3>
                    <p className="problem-item-desc">
                      Intake forms in unfamiliar languages create misunderstandings and leave non-English speakers behind.
                    </p>
                  </div>
                </div>

                <div className="problem-item">
                  <FileText size={20} className="problem-icon" aria-hidden="true" />
                  <div>
                    <h3 className="problem-item-title">Fragmented history</h3>
                    <p className="problem-item-desc">
                      Past prescriptions, lab tests, and discharge summaries remain locked inside physical paper files.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: 60% Transformation Card */}
              <div className="solution-card">
                <div className="solution-row-before">
                  <div className="solution-before-label">Without MediKiosk</div>
                  <p className="solution-before-text">
                    Unstructured waiting room queues, zero prior clinical data, and doctors rushed into 5-minute cold consultations.
                  </p>
                </div>

                <div className="solution-divider" aria-hidden="true" />

                <div className="solution-row-after">
                  <div className="solution-after-label">With MediKiosk</div>
                  <p className="solution-after-text">
                    Structured clinical intelligence, automated triage flags, and digitised timelines ready before consultation begins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION 3: HOW IT WORKS
            ══════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="section" aria-labelledby="how-heading">
          <div className="container">
            <p className="eyebrow">How It Works</p>
            <h2 id="how-heading" className="section-title">
              From voice to clinical record in three steps.
            </h2>

            <div className="steps-container">
              <div className="steps-line" aria-hidden="true" />

              {/* Step 1 */}
              <div className="step-column">
                <div className="step-header">
                  <span className="step-num">01</span>
                  <span className="step-icon">
                    <Mic size={20} aria-hidden="true" />
                  </span>
                </div>
                <h3 className="step-title">Speak</h3>
                <p className="step-desc">
                  Patients speak naturally in their preferred language via voice or touch intake.
                </p>
              </div>

              {/* Step 2 */}
              <div className="step-column">
                <div className="step-header">
                  <span className="step-num">02</span>
                  <span className="step-icon">
                    <Sparkles size={20} aria-hidden="true" />
                  </span>
                </div>
                <h3 className="step-title">AI structures it</h3>
                <p className="step-desc">
                  Deterministic rules and clinical NLP extract symptoms, duration, and severity.
                </p>
              </div>

              {/* Step 3 */}
              <div className="step-column">
                <div className="step-header">
                  <span className="step-num">03</span>
                  <span className="step-icon">
                    <CheckCircle size={20} aria-hidden="true" />
                  </span>
                </div>
                <h3 className="step-title">Doctor reviews & confirms</h3>
                <p className="step-desc">
                  Clinicians verify structured findings before saving to the electronic health record.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION 4: SAFETY / HUMAN-IN-THE-LOOP
            ══════════════════════════════════════════════════════ */}
        <section id="safety" className="section" aria-labelledby="safety-heading">
          <div className="container">
            <p className="eyebrow eyebrow-red">Safety First</p>
            <h2 id="safety-heading" className="section-title">
              AI flags risk. A clinician always makes the call.
            </h2>

            <div className="safety-card">
              {/* Top Half: Red Flag Alert */}
              <div className="safety-top">
                <div className="safety-alert-left">
                  <ShieldAlert size={20} className="safety-alert-icon" aria-hidden="true" />
                  <span className="safety-alert-title">Acute chest pain + radiation</span>
                </div>
                <div className="safety-priority-badge">
                  Priority Score: 75
                </div>
              </div>

              <div className="safety-divider" aria-hidden="true" />

              {/* Bottom Half: AI vs Doctor Review */}
              <div className="safety-bottom">
                {/* AI-Generated Column */}
                <div className="safety-ai-col">
                  <div className="safety-col-label">AI-Generated Summary</div>
                  <p className="safety-ai-text">
                    "Patient reports acute retrosternal chest pain for 2 hours radiating to left arm with diaphoresis."
                  </p>
                  <div className="safety-actions">
                    <button type="button" className="safety-btn-accept">
                      Accept
                    </button>
                    <button type="button" className="safety-btn-edit">
                      Edit
                    </button>
                    <button type="button" className="safety-btn-reject">
                      Reject
                    </button>
                  </div>
                </div>

                {/* Doctor Confirmed Column */}
                <div className="safety-doc-col">
                  <div className="safety-doc-header">
                    <span className="safety-doc-label">Doctor Confirmed</span>
                    <span className="safety-verified-badge">
                      <Check size={14} aria-hidden="true" />
                      Verified
                    </span>
                  </div>
                  <p className="safety-doc-text">
                    "Confirmed acute presentation. Emergency ECG and cardiac markers ordered immediately."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION 5: BUILT FOR INDIA
            ══════════════════════════════════════════════════════ */}
        <section id="built-for-india" className="section" aria-labelledby="built-heading">
          <div className="container">
            <p className="eyebrow">Built for Real Clinical Workflows</p>
            <h2 id="built-heading" className="section-title">
              Interoperable by design.
            </h2>

            <div className="tech-row">
              <div className="tech-item">
                <ShieldCheck size={24} className="tech-icon" aria-hidden="true" />
                <span className="tech-label">ABHA Compatible</span>
              </div>

              <div className="tech-item">
                <Activity size={24} className="tech-icon" aria-hidden="true" />
                <span className="tech-label">FHIR R4</span>
              </div>

              <div className="tech-item">
                <Globe size={24} className="tech-icon" aria-hidden="true" />
                <span className="tech-label">10 Indian Languages</span>
              </div>

              <div className="tech-item">
                <Layers size={24} className="tech-icon" aria-hidden="true" />
                <span className="tech-label">Next.js + FastAPI</span>
              </div>

              <div className="tech-item">
                <Database size={24} className="tech-icon" aria-hidden="true" />
                <span className="tech-label">PostgreSQL</span>
              </div>

              <div className="tech-item">
                <Cpu size={24} className="tech-icon" aria-hidden="true" />
                <span className="tech-label">Gemini AI</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION 6: FINAL CTA
            ══════════════════════════════════════════════════════ */}
        <section className="cta-band" aria-labelledby="cta-heading">
          <div className="container">
            <h2 id="cta-heading" className="cta-title">
              The first step is simply listening.
            </h2>
            <p className="cta-subtext">
              Deploy MediKiosk in outpatient departments to streamline triage and empower doctors.
            </p>
            <Link href="/start" className="btn-hero-primary" id="cta-launch-btn">
              Launch Kiosk →
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="footer-bar" role="contentinfo">
        <div className="container footer-inner">
          <div className="footer-left">
            <div className="nav-logo-icon" style={{ width: 24, height: 24, borderRadius: 6 }}>
              <MediKioskCrossIcon size={12} />
            </div>
            <span className="footer-wordmark">MediKiosk</span>
          </div>

          <div className="footer-links">
            <a
              href="http://localhost:3001"
              className="footer-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Doctor Portal
            </a>
            <a
              href="http://localhost:3002"
              className="footer-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Admin Console
            </a>
            <a
              href="https://github.com/SIH2k26/MediKiosk"
              className="footer-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
