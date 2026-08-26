'use client';

import { useEffect, useState } from 'react';
import './home.css';

const PORTALS = [
  {
    id: 'kiosk',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 4L28 11V21L16 28L4 21V11L16 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M16 12V20M12 16H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Patient Kiosk',
    subtitle: 'AI Clinical Intake',
    desc: 'Begin your medical check-in. Register, identify yourself, record clinical history, and upload documents — all before your consultation.',
    cta: 'Start Check-in →',
    href: '/start',
    color: '#1A73E8',
    glow: 'rgba(26, 115, 232, 0.25)',
    border: 'rgba(26, 115, 232, 0.3)',
    badge: 'Patient',
    badgeColor: 'rgba(26, 115, 232, 0.15)',
    badgeText: '#6BA3FF',
    external: false,
  },
  {
    id: 'doctor',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 27c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M22 20h4M24 18v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Doctor Portal',
    subtitle: 'OPD Management',
    desc: 'View patient queue, review AI-generated clinical summaries, manage triage alerts, and access patient histories in real-time.',
    cta: 'Open Doctor Portal →',
    href: 'http://localhost:3001',
    color: '#1E8E3E',
    glow: 'rgba(30, 142, 62, 0.2)',
    border: 'rgba(30, 142, 62, 0.25)',
    badge: 'Doctors Only',
    badgeColor: 'rgba(30, 142, 62, 0.12)',
    badgeText: '#69F0AE',
    external: true,
  },
  {
    id: 'admin',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 3L29 10.5V21.5L16 29L3 21.5V10.5L16 3Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M12 16h8M16 12v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Admin Panel',
    subtitle: 'System Administration',
    desc: 'Manage users, configure kiosk devices, review audit logs, and monitor OPD analytics and system performance metrics.',
    cta: 'Access Admin Panel →',
    href: 'http://localhost:3002',
    color: '#7C3AED',
    glow: 'rgba(124, 58, 237, 0.2)',
    border: 'rgba(124, 58, 237, 0.25)',
    badge: 'Admins Only',
    badgeColor: 'rgba(124, 58, 237, 0.12)',
    badgeText: '#A78BFA',
    external: true,
  },
];

const FEATURES = [
  { icon: '🤖', title: 'AI-Powered Summaries', desc: 'Gemini generates structured clinical histories and risk assessments automatically.' },
  { icon: '🎤', title: 'Voice & Touch Input', desc: 'Multilingual voice recording and touch-based questionnaires for all literacy levels.' },
  { icon: '🔒', title: 'ABHA Integration', desc: 'Ayushman Bharat Health Account linking for seamless patient identification.' },
  { icon: '🌍', title: '10 Indian Languages', desc: 'Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi & English.' },
  { icon: '📄', title: 'Document OCR', desc: 'Upload prescriptions and lab reports — AI extracts medications, diagnoses, and vitals.' },
  { icon: '🚨', title: 'Triage Alerts', desc: 'Real-time red-flag detection notifies triage staff of emergencies before the consultation.' },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="home-root">
      {/* Ambient background */}
      <div className="home-bg" aria-hidden="true">
        <div className="home-bg-orb home-bg-orb-1" />
        <div className="home-bg-orb home-bg-orb-2" />
        <div className="home-bg-orb home-bg-orb-3" />
        <div className="home-bg-grid" />
      </div>

      {/* Navigation */}
      <nav className={`home-nav${scrolled ? ' home-nav-scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <div className="home-nav-inner">
          <div className="home-nav-brand">
            <div className="home-nav-logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L20 7.5V14.5L11 20L2 14.5V7.5L11 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M11 8v6M8 11h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="home-nav-brand-name">MediKiosk</span>
          </div>
          <div className="home-nav-links">
            <a href="#portals" className="home-nav-link">Portals</a>
            <a href="#features" className="home-nav-link">Features</a>
            <a href="/start" className="home-nav-cta">Start Check-in →</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="home-hero" aria-label="Hero">
        <div className="home-hero-inner">
          <div className="home-hero-pill fade-in-up">
            <span className="home-hero-pill-dot" aria-hidden="true" />
            AI-Powered Clinical Intake Platform
          </div>

          <h1 className="home-hero-title fade-in-up fade-delay-1">
            Intelligent OPD Intake<br />
            <span className="home-hero-gradient">for India's Hospitals</span>
          </h1>

          <p className="home-hero-sub fade-in-up fade-delay-2">
            MediKiosk transforms patient registration with voice-first, multilingual AI that collects
            clinical history, scans documents, detects red flags, and delivers structured summaries
            to doctors — before the patient even sits down.
          </p>

          <div className="home-hero-actions fade-in-up fade-delay-3">
            <a href="/start" className="home-btn home-btn-primary" id="home-start-kiosk-btn">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M9 6v6M6 9h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Patient Check-in
            </a>
            <a href="#portals" className="home-btn home-btn-secondary">
              View All Portals ↓
            </a>
          </div>

          {/* Trust badges */}
          <div className="home-trust fade-in-up fade-delay-4">
            {['ABHA Compatible', 'HIPAA-Aligned', '10 Languages', 'Open Source'].map((badge) => (
              <span key={badge} className="home-trust-badge">{badge}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Portals Section */}
      <section id="portals" className="home-section" aria-label="Portals">
        <div className="home-section-inner">
          <div className="home-section-label fade-in-up">Access Portals</div>
          <h2 className="home-section-title fade-in-up fade-delay-1">Three Portals, One Platform</h2>
          <p className="home-section-sub fade-in-up fade-delay-2">
            Each portal is purpose-built for its audience — patients, doctors, and administrators.
          </p>

          <div className="home-portals-grid">
            {PORTALS.map((portal, i) => (
              <a
                key={portal.id}
                id={`home-portal-${portal.id}`}
                href={portal.href}
                target={portal.external ? '_blank' : undefined}
                rel={portal.external ? 'noopener noreferrer' : undefined}
                className="home-portal-card fade-in-up"
                style={{
                  animationDelay: `${i * 100 + 200}ms`,
                  ['--portal-color' as any]: portal.color,
                  ['--portal-glow' as any]: portal.glow,
                  ['--portal-border' as any]: portal.border,
                }}
                aria-label={`${portal.title} — ${portal.subtitle}`}
              >
                {/* Glow background */}
                <div className="home-portal-glow" aria-hidden="true" />

                {/* Badge */}
                <div className="home-portal-badge" style={{ background: portal.badgeColor, color: portal.badgeText }}>
                  {portal.badge}
                </div>

                {/* Icon */}
                <div className="home-portal-icon" style={{ color: portal.color }}>
                  {portal.icon}
                </div>

                {/* Content */}
                <div className="home-portal-content">
                  <h3 className="home-portal-title">{portal.title}</h3>
                  <p className="home-portal-subtitle">{portal.subtitle}</p>
                  <p className="home-portal-desc">{portal.desc}</p>
                </div>

                {/* CTA */}
                <div className="home-portal-cta" style={{ color: portal.color }}>
                  {portal.cta}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="home-section home-section-alt" aria-label="Features">
        <div className="home-section-inner">
          <div className="home-section-label fade-in-up">Platform Capabilities</div>
          <h2 className="home-section-title fade-in-up fade-delay-1">Built for the Bharat Health Stack</h2>
          <p className="home-section-sub fade-in-up fade-delay-2">
            Designed ground-up for India's diverse healthcare landscape, with AI at its core.
          </p>

          <div className="home-features-grid">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="home-feature-card fade-in-up"
                style={{ animationDelay: `${i * 80 + 200}ms` }}
              >
                <div className="home-feature-icon" aria-hidden="true">{feature.icon}</div>
                <h3 className="home-feature-title">{feature.title}</h3>
                <p className="home-feature-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="home-cta-banner" aria-label="Call to action">
        <div className="home-cta-inner">
          <h2 className="home-cta-title">Ready to transform your OPD?</h2>
          <p className="home-cta-sub">Start a patient check-in right now, or access the clinical portals.</p>
          <div className="home-cta-actions">
            <a href="/start" className="home-btn home-btn-primary" id="home-footer-kiosk-btn">
              Patient Check-in →
            </a>
            <a href="http://localhost:3001" className="home-btn home-btn-outline" target="_blank" rel="noopener noreferrer">
              Doctor Portal
            </a>
            <a href="http://localhost:3002" className="home-btn home-btn-outline" target="_blank" rel="noopener noreferrer">
              Admin Panel
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer" role="contentinfo">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <div className="home-nav-logo" aria-hidden="true" style={{ width: 28, height: 28 }}>
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L20 7.5V14.5L11 20L2 14.5V7.5L11 2Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M11 8v6M8 11h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span>MediKiosk — AI Clinical Intake Platform</span>
          </div>
          <div className="home-footer-meta">
            Built for Smart India Hackathon 2026 &nbsp;·&nbsp; Open-source healthcare technology
          </div>
        </div>
      </footer>
    </div>
  );
}
