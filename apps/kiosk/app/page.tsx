'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
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
import ConvergenceDiagram from '../components/ConvergenceDiagram';

function MediKioskCrossIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.2 } }
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper text-ink-primary flex flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-rule bg-dark text-ink-onDark">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-[1200px]">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-logo flex items-center justify-center text-ink-onDark">
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
        {/* HERO SECTION */}
        <section className="py-20 md:py-32 relative overflow-hidden" aria-labelledby="hero-heading">
          <div className="container mx-auto px-4 max-w-[1200px]">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div 
                className="flex flex-col gap-8"
                initial="hidden"
                animate="visible"
                variants={stagger}
              >
                <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-rule bg-paper-raised text-xs font-mono text-ink-secondary w-fit uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  MEDIKIOSK CLINICAL INTELLIGENCE · SYSTEM ONLINE
                </motion.div>

                <motion.div variants={fadeIn}>
                  <p className="text-accent font-semibold tracking-wider text-sm mb-4">SMART INDIA HACKATHON 2026</p>
                  <h1 id="hero-heading" className="font-serif text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-6">
                    Healthcare<br />
                    starts with<br />
                    <em className="text-ink-secondary not-italic">being heard.</em>
                  </h1>
                  <p className="text-lg md:text-xl text-ink-secondary max-w-[600px] leading-relaxed">
                    MediKiosk turns a patient's voice, touch responses, and medical documents into structured clinical intelligence — before the consultation begins.
                  </p>
                </motion.div>

                <motion.div variants={fadeIn} className="flex flex-wrap items-center gap-4">
                  <Link href="/start" id="hero-launch-btn">
                    <Button size="lg" className="gap-2">
                      <MediKioskCrossIcon size={18} />
                      Launch Kiosk →
                    </Button>
                  </Link>
                  <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg">Doctor View →</Button>
                  </a>
                </motion.div>

                <motion.div variants={fadeIn} className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted font-medium font-mono uppercase tracking-wide text-[12px]">
                  <span>ABHA Compatible</span>
                  <span>FHIR R4</span>
                  <span>10 Indian Languages</span>
                  <span>Open Source</span>
                </motion.div>
              </motion.div>

              <motion.div 
                className="hidden lg:block"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <ConvergenceDiagram />
              </motion.div>
            </div>
          </div>
        </section>

        {/* THE PROBLEM SECTION */}
        <section id="problem" className="py-24 bg-paper-sunken border-y border-rule" aria-labelledby="problem-heading">
          <div className="container mx-auto px-4 max-w-[1200px]">
            <motion.div 
              className="mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
            >
              <p className="text-accent font-mono tracking-wide text-xs mb-3 uppercase">The Problem</p>
              <h2 id="problem-heading" className="font-serif text-3xl md:text-5xl font-bold tracking-tight max-w-2xl">
                A five-minute wait shouldn't cost a doctor five minutes of context.
              </h2>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-12">
              <motion.div 
                className="lg:col-span-5 flex flex-col gap-8"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
              >
                <motion.div variants={fadeIn} className="flex gap-4">
                  <div className="mt-1 text-ink-secondary"><Clock size={24} /></div>
                  <div>
                    <h3 className="font-sans text-xl font-semibold mb-2 text-ink-primary">Long queues</h3>
                    <p className="text-ink-secondary leading-relaxed">Patients wait without providing clinical context, forcing doctors to start from scratch every consultation.</p>
                  </div>
                </motion.div>
                <motion.div variants={fadeIn} className="flex gap-4">
                  <div className="mt-1 text-ink-secondary"><Globe size={24} /></div>
                  <div>
                    <h3 className="font-sans text-xl font-semibold mb-2 text-ink-primary">Language barriers</h3>
                    <p className="text-ink-secondary leading-relaxed">Intake forms in unfamiliar languages create misunderstandings and leave non-English speakers behind.</p>
                  </div>
                </motion.div>
                <motion.div variants={fadeIn} className="flex gap-4">
                  <div className="mt-1 text-ink-secondary"><FileText size={24} /></div>
                  <div>
                    <h3 className="font-sans text-xl font-semibold mb-2 text-ink-primary">Fragmented history</h3>
                    <p className="text-ink-secondary leading-relaxed">Past prescriptions, lab tests, and discharge summaries remain locked inside physical paper files.</p>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div 
                className="lg:col-span-7"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="h-full bg-paper flex flex-col justify-center p-8 lg:p-12 border-rule hover:shadow-raised transition-shadow duration-300">
                  <div className="mb-8">
                    <div className="text-[12px] font-mono text-ink-tertiary uppercase tracking-wider mb-3">Without MediKiosk</div>
                    <p className="text-lg text-ink-secondary">Unstructured waiting room queues, zero prior clinical data, and doctors rushed into 5-minute cold consultations.</p>
                  </div>
                  <div className="h-px w-full bg-paper-rule mb-8" />
                  <div>
                    <div className="text-[12px] font-mono text-accent uppercase tracking-wider mb-3">With MediKiosk</div>
                    <p className="text-xl font-medium text-ink-primary">Structured clinical intelligence, automated triage flags, and digitised timelines ready before consultation begins.</p>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24" aria-labelledby="how-heading">
          <div className="container mx-auto px-4 max-w-[1200px]">
            <motion.div 
              className="mb-16 text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <p className="text-accent font-mono tracking-wide text-xs mb-3 uppercase">How It Works</p>
              <h2 id="how-heading" className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-ink-primary">
                From voice to clinical record in three steps.
              </h2>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-3 gap-8 relative"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-paper-rule -z-10" />
              
              <motion.div variants={fadeIn} className="flex flex-col items-center text-center gap-4 group">
                <div className="w-24 h-24 rounded-full bg-paper-raised border border-rule flex flex-col items-center justify-center gap-2 group-hover:border-accent transition-colors duration-300 shadow-sm">
                  <span className="text-xs font-mono text-ink-tertiary uppercase tracking-wide">01</span>
                  <Mic size={24} className="text-accent" />
                </div>
                <h3 className="font-sans text-xl font-bold text-ink-primary">Speak</h3>
                <p className="text-ink-secondary px-4 text-sm leading-relaxed">Patients speak naturally in their preferred language via voice or touch intake.</p>
              </motion.div>

              <motion.div variants={fadeIn} className="flex flex-col items-center text-center gap-4 group">
                <div className="w-24 h-24 rounded-full bg-paper-raised border border-rule flex flex-col items-center justify-center gap-2 group-hover:border-accent transition-colors duration-300 shadow-sm">
                  <span className="text-xs font-mono text-ink-tertiary uppercase tracking-wide">02</span>
                  <Sparkles size={24} className="text-accent" />
                </div>
                <h3 className="font-sans text-xl font-bold text-ink-primary">AI structures it</h3>
                <p className="text-ink-secondary px-4 text-sm leading-relaxed">Deterministic rules and clinical NLP extract symptoms, duration, and severity.</p>
              </motion.div>

              <motion.div variants={fadeIn} className="flex flex-col items-center text-center gap-4 group">
                <div className="w-24 h-24 rounded-full bg-paper-raised border border-rule flex flex-col items-center justify-center gap-2 group-hover:border-accent transition-colors duration-300 shadow-sm">
                  <span className="text-xs font-mono text-ink-tertiary uppercase tracking-wide">03</span>
                  <CheckCircle size={24} className="text-accent" />
                </div>
                <h3 className="font-sans text-xl font-bold text-ink-primary">Doctor confirms</h3>
                <p className="text-ink-secondary px-4 text-sm leading-relaxed">Clinicians verify structured findings before saving to the electronic health record.</p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* SAFETY FIRST */}
        <section id="safety" className="py-24 bg-paper-sunken border-y border-rule" aria-labelledby="safety-heading">
          <div className="container mx-auto px-4 max-w-[1200px]">
            <motion.div 
              className="mb-16 text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <p className="text-signal-critical font-mono tracking-wide text-xs mb-3 uppercase">Safety First</p>
              <h2 id="safety-heading" className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-ink-primary">
                AI flags risk. A clinician always makes the call.
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="max-w-4xl mx-auto overflow-hidden border-rule shadow-raised">
                <div className="bg-signal-warningWash p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule">
                  <div className="flex items-center gap-3 text-signal-critical">
                    <ShieldAlert size={24} />
                    <span className="font-sans font-bold text-lg">Acute chest pain + radiation</span>
                  </div>
                  <SeverityBadge severity="critical" className="font-mono text-[12px] uppercase tracking-wide">Priority Score: 75</SeverityBadge>
                </div>
                
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-rule bg-paper">
                  <div className="p-8 flex flex-col gap-6">
                    <div className="text-[12px] font-mono text-ink-tertiary uppercase tracking-wider">AI-Generated Summary</div>
                    <p className="text-ink-secondary leading-relaxed italic">"Patient reports acute retrosternal chest pain for 2 hours radiating to left arm with diaphoresis."</p>
                    <div className="flex gap-3 mt-auto pt-4 border-t border-rule">
                      <Button variant="outline" className="flex-1 font-sans text-sm">Accept</Button>
                      <Button variant="outline" className="flex-1 font-sans text-sm">Edit</Button>
                      <Button variant="outline" className="flex-1 font-sans text-sm">Reject</Button>
                    </div>
                  </div>
                  <div className="p-8 bg-paper-raised flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] font-mono text-ink-tertiary uppercase tracking-wider">Doctor Confirmed</div>
                      <SeverityBadge severity="default" className="gap-1 font-mono text-[12px] uppercase tracking-wide"><Check size={12}/> Verified</SeverityBadge>
                    </div>
                    <p className="text-ink-primary leading-relaxed">"Confirmed acute presentation. Emergency ECG and cardiac markers ordered immediately."</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* BUILT FOR INDIA */}
        <section id="built-for-india" className="py-24" aria-labelledby="built-heading">
          <div className="container mx-auto px-4 text-center max-w-[1200px]">
            <motion.div 
              className="mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
            >
              <p className="text-accent font-mono tracking-wide text-xs mb-3 uppercase">Built for Real Clinical Workflows</p>
              <h2 id="built-heading" className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-ink-primary">
                Interoperable by design.
              </h2>
            </motion.div>

            <motion.div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              {[
                { icon: ShieldCheck, label: 'ABHA Compatible' },
                { icon: Activity, label: 'FHIR R4' },
                { icon: Globe, label: '10 Indian Languages' },
                { icon: Layers, label: 'Next.js + FastAPI' },
                { icon: Database, label: 'PostgreSQL' },
                { icon: Cpu, label: 'Gemini AI' },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeIn} className="flex flex-col items-center gap-4 p-6 rounded-xl bg-paper-raised border border-rule hover:border-accent hover:shadow-raised transition-all duration-300">
                  <item.icon size={32} className="text-ink-secondary" />
                  <span className="text-sm font-sans font-medium text-ink-primary">{item.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-32 bg-accent text-ink-onDark text-center" aria-labelledby="cta-heading">
          <div className="container mx-auto px-4 max-w-[1200px]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.h2 id="cta-heading" variants={fadeIn} className="font-serif text-4xl md:text-6xl font-bold tracking-tight mb-6 text-ink-onDark">
                The first step is simply listening.
              </motion.h2>
              <motion.p variants={fadeIn} className="text-xl opacity-90 max-w-2xl mx-auto mb-10 font-sans text-ink-onDarkMuted">
                Deploy MediKiosk in outpatient departments to streamline triage and empower doctors.
              </motion.p>
              <motion.div variants={fadeIn}>
                <Link href="/start" id="cta-launch-btn">
                  <Button size="lg" variant="outline" className="bg-paper text-ink-primary border-transparent hover:bg-paper-raised font-sans shadow-raised">
                    Launch Kiosk →
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-rule bg-paper" role="contentinfo">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 max-w-[1200px]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-ink-muted flex items-center justify-center text-ink-primary">
              <MediKioskCrossIcon size={12} />
            </div>
            <span className="font-bold text-sm tracking-tight text-ink-secondary font-sans">MediKiosk</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-ink-muted font-sans">
            <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="hover:text-ink-primary transition-colors">Doctor Portal</a>
            <a href="http://localhost:3002" target="_blank" rel="noopener noreferrer" className="hover:text-ink-primary transition-colors">Admin Console</a>
            <a href="https://github.com/SIH2k26/MediKiosk" target="_blank" rel="noopener noreferrer" className="hover:text-ink-primary transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}






