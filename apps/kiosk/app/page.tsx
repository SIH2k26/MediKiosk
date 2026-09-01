'use client';

import Link from 'next/link';
import {
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
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { SeverityBadge } from '../components/ui/severity-badge';
import { NavItem } from '../components/ui/nav-item';

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
    <div className="min-h-screen bg-dark text-ink-primary flex flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-dark-rule bg-dark/95 backdrop-blur supports-[backdrop-filter]:bg-dark/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-dark">
              <MediKioskCrossIcon size={16} />
            </div>
            <span className="font-bold text-lg tracking-tight">MediKiosk</span>
          </Link>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <NavItem href="#how-it-works">How it works</NavItem>
              <NavItem href="#how-it-works">Clinical AI</NavItem>
              <NavItem href="#safety">For Doctors</NavItem>
              <NavItem href="http://localhost:3001" target="_blank">Doctor Portal</NavItem>
            </nav>

            <Link href="/start" id="nav-launch-btn">
              <Button variant="default">Launch Kiosk →</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 relative overflow-hidden" aria-labelledby="hero-heading">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-dark-rule bg-dark-raised text-xs font-mono text-ink-secondary w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  MEDIKIOSK CLINICAL INTELLIGENCE · SYSTEM ONLINE
                </div>

                <div>
                  <p className="text-accent font-semibold tracking-wider text-sm mb-4">SMART INDIA HACKATHON 2026</p>
                  <h1 id="hero-heading" className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-6">
                    Healthcare<br />
                    starts with<br />
                    <em className="text-ink-secondary not-italic">being heard.</em>
                  </h1>
                  <p className="text-lg md:text-xl text-ink-secondary max-w-[600px] leading-relaxed">
                    MediKiosk turns a patient's voice, touch responses, and medical documents into structured clinical intelligence — before the consultation begins.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/start" id="hero-launch-btn">
                    <Button size="lg" className="gap-2">
                      <MediKioskCrossIcon size={18} />
                      Launch Kiosk
                    </Button>
                  </Link>
                  <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg">Doctor View →</Button>
                  </a>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted font-medium">
                  <span>ABHA Compatible</span>
                  <span>FHIR R4</span>
                  <span>10 Indian Languages</span>
                  <span>Open Source</span>
                  <span>SIH 2026</span>
                </div>
              </div>

              <div className="relative h-[600px] bg-dark-raised rounded-2xl border border-dark-rule p-8 hidden lg:block overflow-hidden shadow-card">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-accent/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-accent rounded-full flex items-center justify-center text-dark z-10 shadow-raised">
                  <MediKioskCrossIcon size={24} />
                </div>
                
                <Card className="absolute top-8 left-8 w-64 bg-dark/80 backdrop-blur border-dark-ruleStrong">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">Patient · Hindi</div>
                    <div className="text-sm">"मुझे सीने में दर्द है<br />दो घंटे से।"</div>
                    <SeverityBadge severity="low" className="w-fit">● Listening</SeverityBadge>
                  </CardContent>
                </Card>

                <Card className="absolute top-32 right-8 w-64 bg-dark/80 backdrop-blur border-dark-ruleStrong">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">Extracted Entities</div>
                    <div className="flex flex-col gap-2">
                      <SeverityBadge severity="low">Chest Pain</SeverityBadge>
                      <SeverityBadge severity="medium">2 Hours</SeverityBadge>
                      <SeverityBadge severity="high">Severe</SeverityBadge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="absolute bottom-32 left-12 w-64 bg-dark/80 backdrop-blur border-dark-ruleStrong">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">Triage Signal</div>
                    <div className="text-signal-critical font-bold text-sm">⚠ RED FLAG</div>
                    <div className="text-xs text-ink-secondary">Acute chest pain · High Priority</div>
                    <SeverityBadge severity="high" className="w-fit">Priority 75</SeverityBadge>
                  </CardContent>
                </Card>

                <Card className="absolute bottom-12 right-12 w-64 bg-dark/80 backdrop-blur border-dark-ruleStrong">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">Doctor Dashboard</div>
                    <div className="text-sm">Clinical Summary</div>
                    <div className="text-xs text-ink-secondary">Ready before consultation</div>
                    <SeverityBadge severity="low" className="w-fit">✓ AI Prepared</SeverityBadge>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className="py-24 bg-dark-sunken border-y border-dark-rule" aria-labelledby="problem-heading">
          <div className="container mx-auto px-4">
            <div className="mb-16">
              <p className="text-accent font-semibold tracking-wide text-sm mb-3 uppercase">The Problem</p>
              <h2 id="problem-heading" className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl">
                A five-minute wait shouldn't cost a doctor five minutes of context.
              </h2>
            </div>

            <div className="grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-5 flex flex-col gap-8">
                <div className="flex gap-4">
                  <div className="mt-1 text-ink-secondary"><Clock size={24} /></div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Long queues</h3>
                    <p className="text-ink-secondary leading-relaxed">Patients wait without providing clinical context, forcing doctors to start from scratch every consultation.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 text-ink-secondary"><Globe size={24} /></div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Language barriers</h3>
                    <p className="text-ink-secondary leading-relaxed">Intake forms in unfamiliar languages create misunderstandings and leave non-English speakers behind.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 text-ink-secondary"><FileText size={24} /></div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Fragmented history</h3>
                    <p className="text-ink-secondary leading-relaxed">Past prescriptions, lab tests, and discharge summaries remain locked inside physical paper files.</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <Card className="h-full bg-dark flex flex-col justify-center p-8 lg:p-12">
                  <div className="mb-8">
                    <div className="text-sm font-mono text-ink-muted uppercase tracking-wider mb-3">Without MediKiosk</div>
                    <p className="text-lg text-ink-secondary">Unstructured waiting room queues, zero prior clinical data, and doctors rushed into 5-minute cold consultations.</p>
                  </div>
                  <div className="h-px w-full bg-dark-rule mb-8" />
                  <div>
                    <div className="text-sm font-mono text-accent uppercase tracking-wider mb-3">With MediKiosk</div>
                    <p className="text-xl font-medium">Structured clinical intelligence, automated triage flags, and digitised timelines ready before consultation begins.</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-24" aria-labelledby="how-heading">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <p className="text-accent font-semibold tracking-wide text-sm mb-3 uppercase">How It Works</p>
              <h2 id="how-heading" className="text-3xl md:text-5xl font-bold tracking-tight">
                From voice to clinical record in three steps.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-dark-rule -z-10" />
              
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-24 h-24 rounded-full bg-dark-raised border border-dark-rule flex flex-col items-center justify-center gap-2">
                  <span className="text-xs font-mono text-ink-muted">01</span>
                  <Mic size={24} className="text-accent" />
                </div>
                <h3 className="text-xl font-bold">Speak</h3>
                <p className="text-ink-secondary px-4">Patients speak naturally in their preferred language via voice or touch intake.</p>
              </div>

              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-24 h-24 rounded-full bg-dark-raised border border-dark-rule flex flex-col items-center justify-center gap-2">
                  <span className="text-xs font-mono text-ink-muted">02</span>
                  <Sparkles size={24} className="text-accent" />
                </div>
                <h3 className="text-xl font-bold">AI structures it</h3>
                <p className="text-ink-secondary px-4">Deterministic rules and clinical NLP extract symptoms, duration, and severity.</p>
              </div>

              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-24 h-24 rounded-full bg-dark-raised border border-dark-rule flex flex-col items-center justify-center gap-2">
                  <span className="text-xs font-mono text-ink-muted">03</span>
                  <CheckCircle size={24} className="text-accent" />
                </div>
                <h3 className="text-xl font-bold">Doctor confirms</h3>
                <p className="text-ink-secondary px-4">Clinicians verify structured findings before saving to the electronic health record.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="safety" className="py-24 bg-dark-sunken border-y border-dark-rule" aria-labelledby="safety-heading">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <p className="text-signal-critical font-semibold tracking-wide text-sm mb-3 uppercase">Safety First</p>
              <h2 id="safety-heading" className="text-3xl md:text-5xl font-bold tracking-tight">
                AI flags risk. A clinician always makes the call.
              </h2>
            </div>

            <Card className="max-w-4xl mx-auto overflow-hidden">
              <div className="bg-signal-critical p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-rule">
                <div className="flex items-center gap-3 text-signal-critical">
                  <ShieldAlert size={24} />
                  <span className="font-bold text-lg">Acute chest pain + radiation</span>
                </div>
                <SeverityBadge severity="high">Priority Score: 75</SeverityBadge>
              </div>
              
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-dark-rule">
                <div className="p-8 flex flex-col gap-6">
                  <div className="text-sm font-mono text-ink-muted uppercase tracking-wider">AI-Generated Summary</div>
                  <p className="text-ink-secondary leading-relaxed italic">"Patient reports acute retrosternal chest pain for 2 hours radiating to left arm with diaphoresis."</p>
                  <div className="flex gap-3 mt-auto">
                    <Button variant="outline" className="flex-1">Accept</Button>
                    <Button variant="outline" className="flex-1">Edit</Button>
                    <Button variant="destructive" className="flex-1">Reject</Button>
                  </div>
                </div>
                <div className="p-8 bg-dark-raised flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-mono text-ink-muted uppercase tracking-wider">Doctor Confirmed</div>
                    <SeverityBadge severity="low" className="gap-1"><Check size={12}/> Verified</SeverityBadge>
                  </div>
                  <p className="leading-relaxed">"Confirmed acute presentation. Emergency ECG and cardiac markers ordered immediately."</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="built-for-india" className="py-24" aria-labelledby="built-heading">
          <div className="container mx-auto px-4 text-center">
            <div className="mb-16">
              <p className="text-accent font-semibold tracking-wide text-sm mb-3 uppercase">Built for Real Clinical Workflows</p>
              <h2 id="built-heading" className="text-3xl md:text-5xl font-bold tracking-tight">
                Interoperable by design.
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { icon: ShieldCheck, label: 'ABHA Compatible' },
                { icon: Activity, label: 'FHIR R4' },
                { icon: Globe, label: '10 Indian Languages' },
                { icon: Layers, label: 'Next.js + FastAPI' },
                { icon: Database, label: 'PostgreSQL' },
                { icon: Cpu, label: 'Gemini AI' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-4 p-6 rounded-xl bg-dark-raised border border-dark-rule">
                  <item.icon size={32} className="text-ink-secondary" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 bg-accent text-dark text-center" aria-labelledby="cta-heading">
          <div className="container mx-auto px-4">
            <h2 id="cta-heading" className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              The first step is simply listening.
            </h2>
            <p className="text-xl opacity-80 max-w-2xl mx-auto mb-10">
              Deploy MediKiosk in outpatient departments to streamline triage and empower doctors.
            </p>
            <Link href="/start" id="cta-launch-btn">
              <Button size="lg" variant="outline" className="bg-dark text-ink-primary border-transparent hover:bg-dark-raised">
                Launch Kiosk →
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-dark-rule bg-dark" role="contentinfo">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-ink-muted flex items-center justify-center text-dark">
              <MediKioskCrossIcon size={12} />
            </div>
            <span className="font-bold text-sm tracking-tight text-ink-secondary">MediKiosk</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-ink-muted">
            <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="hover:text-ink-primary transition-colors">Doctor Portal</a>
            <a href="http://localhost:3002" target="_blank" rel="noopener noreferrer" className="hover:text-ink-primary transition-colors">Admin Console</a>
            <a href="https://github.com/SIH2k26/MediKiosk" target="_blank" rel="noopener noreferrer" className="hover:text-ink-primary transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
