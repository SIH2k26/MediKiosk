'use client';

import { motion } from 'framer-motion';

export default function ConvergenceDiagram() {
  return (
    <div className="relative w-full h-[500px] md:h-[600px] my-12 overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Connecting lines */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <linearGradient id="lineGrad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        {/* Patient -> Kiosk */}
        <motion.path d="M 25 25 L 50 50" vectorEffect="non-scaling-stroke" stroke="var(--rule)" strokeWidth="2" strokeDasharray="4 4" fill="none" animate={{ strokeDashoffset: -20 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
        {/* Kiosk -> Entities */}
        <motion.path d="M 50 50 L 75 25" vectorEffect="non-scaling-stroke" stroke="var(--rule)" strokeWidth="2" strokeDasharray="4 4" fill="none" animate={{ strokeDashoffset: -20 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
        {/* Kiosk -> Triage */}
        <motion.path d="M 50 50 L 25 75" vectorEffect="non-scaling-stroke" stroke="var(--rule)" strokeWidth="2" strokeDasharray="4 4" fill="none" animate={{ strokeDashoffset: -20 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
        {/* Entities -> Doctor */}
        <motion.path d="M 75 25 L 75 75" vectorEffect="non-scaling-stroke" stroke="var(--rule)" strokeWidth="2" strokeDasharray="4 4" fill="none" animate={{ strokeDashoffset: -20 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
        {/* Triage -> Doctor */}
        <motion.path d="M 25 75 L 75 75" vectorEffect="non-scaling-stroke" stroke="var(--rule)" strokeWidth="2" strokeDasharray="4 4" fill="none" animate={{ strokeDashoffset: -20 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
      </svg>
      
      {/* Central Node: MediKiosk Tablet */}
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div 
          className="w-20 h-28 md:w-28 md:h-40 bg-dark rounded-xl border border-rule shadow-raised flex flex-col items-center p-2"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Tablet Screen */}
          <div className="w-full flex-1 bg-gradient-btn rounded-md border border-rule relative overflow-hidden flex flex-col items-center justify-center shadow-inner">
            <motion.div 
              className="absolute inset-0 bg-accent/30"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="flex flex-col gap-1 w-full px-3 opacity-30">
              <div className="h-1 w-full bg-paper rounded-full" />
              <div className="h-1 w-3/4 bg-paper rounded-full" />
              <div className="h-1 w-1/2 bg-paper rounded-full" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-bold text-[10px] md:text-xs text-ink-onDark tracking-tight z-10">MediKiosk</span>
            </div>
          </div>
          <div className="mt-2 md:mt-3 w-8 h-1 bg-rule/50 rounded-full" />
        </motion.div>
      </div>

      {/* Node 1: Input (Patient) */}
      <div className="absolute top-[25%] left-[25%] -translate-x-1/2 -translate-y-1/2 z-10 w-40 md:w-64">
        <div className="bg-paper border border-rule p-3 md:p-4 rounded-xl shadow-card transition-colors hover:border-accent">
          <div className="text-[9px] md:text-[10px] font-mono text-ink-secondary uppercase tracking-wider mb-2">Patient &middot; Hindi</div>
          <div className="text-xs md:text-sm font-serif mb-3 text-ink-primary">"मुझे सीने में दर्द है दो घंटे से।"</div>
          <div className="text-[10px] md:text-xs text-accent flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Listening...
          </div>
        </div>
      </div>

      {/* Node 2: Extraction */}
      <div className="absolute top-[25%] left-[75%] -translate-x-1/2 -translate-y-1/2 z-10 w-40 md:w-64">
        <div className="bg-paper border border-rule p-3 md:p-4 rounded-xl shadow-card transition-colors hover:border-accent">
          <div className="text-[9px] md:text-[10px] font-mono text-ink-secondary uppercase tracking-wider mb-2">Extracted Entities</div>
          <div className="flex flex-col gap-1.5 md:gap-2">
            <div className="text-[10px] md:text-xs text-ink-primary font-mono bg-paper-sunken px-2 py-1 rounded-md border border-rule w-fit">Chest Pain</div>
            <div className="text-[10px] md:text-xs text-ink-primary font-mono bg-paper-sunken px-2 py-1 rounded-md border border-rule w-fit">2 Hours</div>
            <div className="text-[10px] md:text-xs text-ink-primary font-mono bg-paper-sunken px-2 py-1 rounded-md border border-rule w-fit">Severe</div>
          </div>
        </div>
      </div>

      {/* Node 3: Triage */}
      <div className="absolute top-[75%] left-[25%] -translate-x-1/2 -translate-y-1/2 z-10 w-40 md:w-64">
        <div className="bg-paper border border-rule p-3 md:p-4 rounded-xl shadow-card transition-colors hover:border-signal-critical">
          <div className="text-[9px] md:text-[10px] font-mono text-ink-secondary uppercase tracking-wider mb-2">Triage Signal</div>
          <div className="text-signal-critical font-bold text-xs md:text-sm mb-1 flex items-center gap-1.5">
            <span>&#x1F6A8;</span> RED FLAG
          </div>
          <div className="text-[10px] md:text-xs text-ink-secondary mb-2 leading-relaxed">Acute chest pain &middot; High Priority</div>
          <div className="text-[9px] md:text-xs font-mono bg-signal-criticalWash text-signal-critical border border-signal-critical/20 px-2 py-1 rounded-md w-fit">
            Priority 75
          </div>
        </div>
      </div>

      {/* Node 4: Doctor */}
      <div className="absolute top-[75%] left-[75%] -translate-x-1/2 -translate-y-1/2 z-10 w-40 md:w-64">
        <div className="bg-paper border border-rule p-3 md:p-4 rounded-xl shadow-card transition-colors hover:border-accent">
          <div className="text-[9px] md:text-[10px] font-mono text-ink-secondary uppercase tracking-wider mb-2">Doctor Dashboard</div>
          <div className="text-xs md:text-sm font-semibold text-ink-primary mb-1 font-serif">Clinical Summary</div>
          <div className="text-[10px] md:text-xs text-ink-secondary mb-2 leading-relaxed">Ready before consultation</div>
          <div className="text-[9px] md:text-xs bg-paper-sunken border border-rule text-ink-primary font-medium px-2 py-1 rounded-md w-fit flex items-center gap-1">
            <span className="text-accent">&#10003;</span> AI Prepared
          </div>
        </div>
      </div>
    </div>
  );
}
