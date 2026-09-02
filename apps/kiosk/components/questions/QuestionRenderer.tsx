"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestionDef, QuestionOption } from '../../lib/questionnaire';
import { makeT, speak } from '../../lib/i18n';

export interface QuestionInputProps {
  question: QuestionDef;
  language: string;
  onAnswer: (value: string) => void;
  disabled?: boolean;
}

const optionLabel = (opt: QuestionOption, lang: string) => (lang === 'hi' ? opt.hi : opt.en);

const listVariants: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

// ------------------------------- YES / NO -----------------------------------

export function YesNoInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  return (
    <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 md:gap-6 mt-8">
      <motion.button 
        variants={itemVariants}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="flex flex-col items-center justify-center gap-4 py-10 bg-paper-raised border border-rule hover:border-accent hover:shadow-card rounded-2xl text-ink-primary font-bold text-2xl transition-all"
        disabled={disabled} onClick={() => onAnswer('yes')}
      >
        <span className="text-4xl">&#10003;</span>
        {t('Yes', 'हाँ')}
      </motion.button>
      <motion.button 
        variants={itemVariants}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="flex flex-col items-center justify-center gap-4 py-10 bg-paper-raised border border-rule hover:border-signal-critical hover:shadow-card rounded-2xl text-ink-primary font-bold text-2xl transition-all"
        disabled={disabled} onClick={() => onAnswer('no')}
      >
        <span className="text-4xl">&#10007;</span>
        {t('No', 'नहीं')}
      </motion.button>
    </motion.div>
  );
}

// ---------------------------- SINGLE CHOICE ---------------------------------

export function SingleChoiceInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  return (
    <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-8" role="radiogroup">
      {(question.options || []).map((opt) => (
        <motion.button
          variants={itemVariants}
          key={opt.value}
          className="flex flex-col items-start gap-4 p-6 bg-paper-raised border border-rule hover:border-accent hover:shadow-card rounded-2xl text-left transition-all"
          disabled={disabled}
          onClick={() => onAnswer(opt.value)}
          role="radio"
          aria-checked={false}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        >
          {opt.emoji && <span className="text-4xl mb-2" aria-hidden="true">{opt.emoji}</span>}
          <span className="font-sans font-semibold text-ink-primary text-xl leading-tight">{optionLabel(opt, language)}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}

// ----------------------------- MULTI CHOICE ---------------------------------

export function MultiChoiceInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (value: string) => {
    setSelected((prev) => {
      if (value === 'none') return prev.includes('none') ? [] : ['none'];
      const next = prev.filter((v) => v !== 'none');
      return next.includes(value) ? next.filter((v) => v !== value) : [...next, value];
    });
  };

  return (
    <motion.div variants={listVariants} initial="hidden" animate="show" className="flex flex-col gap-8 mt-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {(question.options || []).map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <motion.button
              variants={itemVariants}
              key={opt.value}
              className={`flex flex-col items-start gap-4 p-6 border-2 rounded-2xl text-left transition-all relative overflow-hidden ${
                isSelected ? 'bg-accent/5 border-accent shadow-raised' : 'bg-paper-raised border-rule hover:border-accent/50'
              }`}
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              role="checkbox"
              aria-checked={isSelected}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              {opt.emoji && <span className="text-4xl mb-2" aria-hidden="true">{opt.emoji}</span>}
              <span className={`font-sans font-semibold text-xl leading-tight ${isSelected ? 'text-ink-primary' : 'text-ink-secondary'}`}>
                {optionLabel(opt, language)}
              </span>
              <AnimatePresence>
                {isSelected && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0, opacity: 0 }} 
                    className="absolute top-4 right-4 text-accent bg-paper rounded-full p-1"
                  >
                    &#10003;
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      <motion.button
        variants={itemVariants}
        className="w-full md:w-auto self-end h-16 px-10 bg-accent text-paper font-bold text-xl rounded-xl shadow-raised disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3"
        disabled={selected.length === 0 || disabled}
        onClick={() => onAnswer(selected.join(','))}
        whileHover={selected.length > 0 ? { scale: 1.02 } : {}}
        whileTap={selected.length > 0 ? { scale: 0.98 } : {}}
      >
        {t('Continue', 'आगे बढ़ें')} &rarr;
      </motion.button>
    </motion.div>
  );
}

// ------------------------------- NUMBER -------------------------------------

export function NumberInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [val, setVal] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val) onAnswer(val); }} className="mt-8">
      <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
        <input
          type="number"
          className="flex-1 h-20 bg-paper-sunken border-2 border-rule rounded-xl px-8 text-3xl font-mono text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          min={question.min ?? 0}
          max={question.max ?? 999}
          placeholder={t('Enter number...', 'नंबर दर्ज करें...')}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          autoFocus
          required
        />
        <motion.button type="submit" className="h-20 px-10 bg-accent text-paper font-bold text-xl rounded-xl shadow-raised disabled:opacity-50 disabled:shadow-none transition-all" disabled={!val || disabled} whileHover={val ? { scale: 1.02 } : {}} whileTap={val ? { scale: 0.98 } : {}}>
          {t('Next', 'आगे')} &rarr;
        </motion.button>
      </div>
    </form>
  );
}

// -------------------------------- DATE --------------------------------------

export function DateInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [val, setVal] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val) onAnswer(val); }} className="mt-8">
      <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
        <input
          type="date"
          className="flex-1 h-20 bg-paper-sunken border-2 border-rule rounded-xl px-8 text-2xl font-sans text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          autoFocus
          required
        />
        <motion.button type="submit" className="h-20 px-10 bg-accent text-paper font-bold text-xl rounded-xl shadow-raised disabled:opacity-50 disabled:shadow-none transition-all" disabled={!val || disabled} whileHover={val ? { scale: 1.02 } : {}} whileTap={val ? { scale: 0.98 } : {}}>
          {t('Next', 'आगे')} &rarr;
        </motion.button>
      </div>
    </form>
  );
}

// -------------------------------- TEXT --------------------------------------

export function TextInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [val, setVal] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val) onAnswer(val); }} className="mt-8">
      <div className="flex flex-col md:flex-row gap-4 max-w-3xl">
        <input
          type="text"
          className="flex-1 h-20 bg-paper-sunken border-2 border-rule rounded-xl px-8 text-2xl font-sans text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-ink-muted"
          placeholder={t('Type your answer...', 'अपना उत्तर टाइप करें...')}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          autoFocus
          required
        />
        <motion.button type="submit" className="h-20 px-10 bg-accent text-paper font-bold text-xl rounded-xl shadow-raised disabled:opacity-50 disabled:shadow-none transition-all shrink-0" disabled={!val || disabled} whileHover={val ? { scale: 1.02 } : {}} whileTap={val ? { scale: 0.98 } : {}}>
          {t('Next', 'आगे')} &rarr;
        </motion.button>
      </div>
    </form>
  );
}

// -------------------------------- SCALE -------------------------------------

export function ScaleInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const min = question.min ?? 1;
  const max = question.max ?? 10;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <motion.div variants={listVariants} initial="hidden" animate="show" className="flex flex-col gap-6 mt-8">
      <div className="grid grid-cols-5 md:grid-cols-10 gap-3 md:gap-4">
        {values.map((v) => (
          <motion.button
            variants={itemVariants}
            key={v}
            className="flex items-center justify-center h-16 md:h-20 bg-paper-raised border-2 border-rule hover:border-accent hover:shadow-card hover:bg-accent/5 rounded-2xl text-ink-primary font-mono font-bold text-2xl transition-all"
            disabled={disabled}
            onClick={() => onAnswer(String(v))}
            aria-label={`${v} / ${max}`}
            whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}
          >
            {v}
          </motion.button>
        ))}
      </div>
      <div className="flex justify-between text-sm md:text-base font-mono uppercase tracking-widest text-ink-tertiary px-2">
        <span>&larr; {t('Mild', 'हल्का')}</span>
        <span>{t('Worst', 'गंभीर')} &rarr;</span>
      </div>
    </motion.div>
  );
}

// ----------------------------- RENDERER --------------------------------------

const COMPONENTS: Record<string, (props: QuestionInputProps) => React.ReactElement> = {
  YES_NO: YesNoInput,
  SINGLE_CHOICE: SingleChoiceInput,
  MULTI_CHOICE: MultiChoiceInput,
  NUMBER: NumberInput,
  DATE: DateInput,
  TEXT: TextInput,
  SCALE: ScaleInput,
};

export default function QuestionRenderer(props: QuestionInputProps) {
  const { question, language } = props;
  const questionText = language === 'hi' ? question.text.hi : question.text.en;
  const Component = COMPONENTS[question.type] ?? TextInput;

  return (
    <motion.div
      className="w-full max-w-[1200px] mx-auto py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      key={question.id}
    >
      <div className="flex items-start justify-between gap-6 mb-4 md:mb-8">
        <h2 className="font-serif text-[40px] md:text-[56px] leading-tight font-bold text-ink-primary m-0 tracking-tight">
          {questionText}
        </h2>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'var(--accent)', color: 'var(--paper)' }} whileTap={{ scale: 0.9 }}
          className="flex items-center justify-center w-16 h-16 bg-paper-raised border border-rule rounded-full shrink-0 text-2xl text-ink-secondary hover:shadow-raised transition-all"
          onClick={() => speak(questionText, language)}
          aria-label="Listen to the question"
        >
          &#128266;
        </motion.button>
      </div>
      <Component {...props} />
    </motion.div>
  );
}
