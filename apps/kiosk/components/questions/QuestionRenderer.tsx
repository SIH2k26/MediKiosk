'use client';

// =============================================================================
// Reusable touch-first question components
// =============================================================================
// Designed for elderly / low-literacy patients: large touch targets, emoji
// affordances, bilingual labels, and an audio prompt per question.
// Each component reports its answer as a string via onAnswer().
// =============================================================================

import { useState } from 'react';
import type { QuestionDef, QuestionOption } from '../../lib/questionnaire';
import { makeT, speak } from '../../lib/i18n';

export interface QuestionInputProps {
  question: QuestionDef;
  language: string;
  onAnswer: (value: string) => void;
  disabled?: boolean;
}

const optionLabel = (opt: QuestionOption, lang: string) => (lang === 'hi' ? opt.hi : opt.en);

const bigButtonStyle: React.CSSProperties = {
  minHeight: '72px',
  fontSize: '1.15rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
};

// ------------------------------- YES / NO -----------------------------------

export function YesNoInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <button className="btn btn-primary btn-xl" style={bigButtonStyle} disabled={disabled} onClick={() => onAnswer('yes')}>
        ✅ {t('Yes', 'हां')}
      </button>
      <button className="btn btn-secondary btn-xl" style={bigButtonStyle} disabled={disabled} onClick={() => onAnswer('no')}>
        ❌ {t('No', 'नहीं')}
      </button>
    </div>
  );
}

// ---------------------------- SINGLE CHOICE ---------------------------------

export function SingleChoiceInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} role="radiogroup">
      {(question.options || []).map((opt) => (
        <button
          key={opt.value}
          className="lang-card"
          style={{ minHeight: '88px' }}
          disabled={disabled}
          onClick={() => onAnswer(opt.value)}
          role="radio"
          aria-checked={false}
        >
          {opt.emoji && <span style={{ fontSize: '1.8rem' }} aria-hidden="true">{opt.emoji}</span>}
          <span className="lang-card-name" style={{ fontSize: '1.05rem' }}>{optionLabel(opt, language)}</span>
        </button>
      ))}
    </div>
  );
}

// ----------------------------- MULTI CHOICE ---------------------------------

export function MultiChoiceInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (value: string) => {
    setSelected((prev) => {
      // 'none' is mutually exclusive with the other options
      if (value === 'none') return prev.includes('none') ? [] : ['none'];
      const next = prev.filter((v) => v !== 'none');
      return next.includes(value) ? next.filter((v) => v !== value) : [...next, value];
    });
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {(question.options || []).map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              className={`lang-card ${isSelected ? 'selected' : ''}`}
              style={{ minHeight: '88px' }}
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              role="checkbox"
              aria-checked={isSelected}
            >
              {opt.emoji && <span style={{ fontSize: '1.8rem' }} aria-hidden="true">{opt.emoji}</span>}
              <span className="lang-card-name" style={{ fontSize: '1.05rem' }}>{optionLabel(opt, language)}</span>
              {isSelected && <span aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
      <button
        className="btn btn-primary btn-xl"
        style={{ ...bigButtonStyle, width: '100%', opacity: selected.length ? 1 : 0.4 }}
        disabled={disabled || selected.length === 0}
        onClick={() => onAnswer(selected.join(','))}
      >
        {t('Confirm', 'पुष्टि करें')} →
      </button>
    </div>
  );
}

// -------------------------------- NUMBER ------------------------------------

export function NumberInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [value, setValue] = useState('');
  const isValid =
    value !== '' &&
    (question.min === undefined || Number(value) >= question.min) &&
    (question.max === undefined || Number(value) <= question.max);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <input
        type="number"
        inputMode="numeric"
        className="form-input"
        style={{ fontSize: '1.5rem', textAlign: 'center', minHeight: '64px' }}
        min={question.min}
        max={question.max}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className="btn btn-primary btn-xl"
        style={{ ...bigButtonStyle, opacity: isValid ? 1 : 0.4 }}
        disabled={disabled || !isValid}
        onClick={() => onAnswer(value)}
      >
        {t('Confirm', 'पुष्टि करें')} →
      </button>
    </div>
  );
}

// --------------------------------- DATE -------------------------------------

export function DateInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [value, setValue] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <input
        type="date"
        className="form-input"
        style={{ fontSize: '1.3rem', minHeight: '64px' }}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className="btn btn-primary btn-xl"
        style={{ ...bigButtonStyle, opacity: value ? 1 : 0.4 }}
        disabled={disabled || !value}
        onClick={() => onAnswer(value)}
      >
        {t('Confirm', 'पुष्टि करें')} →
      </button>
    </div>
  );
}

// --------------------------------- TEXT -------------------------------------

export function TextInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [value, setValue] = useState('');
  const canSkip = !question.required;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <textarea
        className="form-input"
        rows={3}
        style={{ fontSize: '1.2rem', resize: 'none' }}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('Type here…', 'यहां लिखें…')}
      />
      <div style={{ display: 'grid', gridTemplateColumns: canSkip ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        {canSkip && (
          <button className="btn btn-secondary btn-xl" style={bigButtonStyle} disabled={disabled} onClick={() => onAnswer('skipped')}>
            {t('Skip', 'छोड़ें')}
          </button>
        )}
        <button
          className="btn btn-primary btn-xl"
          style={{ ...bigButtonStyle, opacity: value.trim() ? 1 : 0.4 }}
          disabled={disabled || !value.trim()}
          onClick={() => onAnswer(value.trim())}
        >
          {t('Confirm', 'पुष्टि करें')} →
        </button>
      </div>
    </div>
  );
}

// -------------------------- SCALE (severity 1–10) ---------------------------

export function ScaleInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const min = question.min ?? 1;
  const max = question.max ?? 10;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {values.map((v) => (
          <button
            key={v}
            className="lang-card"
            style={{ minHeight: '72px', fontSize: '1.5rem', fontWeight: 700 }}
            disabled={disabled}
            onClick={() => onAnswer(String(v))}
            aria-label={`${v} / ${max}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
        <span>🙂 {t('Mild', 'हल्की')}</span>
        <span>😣 {t('Worst', 'सबसे गंभीर')}</span>
      </div>
    </div>
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
    <div className="card fade-in-up" key={question.id}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <h2 className="text-heading" style={{ fontSize: '1.5rem', lineHeight: 1.4 }}>{questionText}</h2>
        <button
          className="btn btn-secondary"
          style={{ minHeight: '48px', borderRadius: 'var(--radius-full)', padding: '0 1.25rem', flexShrink: 0 }}
          onClick={() => speak(questionText, language)}
          aria-label="Listen to the question"
        >
          🔊
        </button>
      </div>
      <Component {...props} />
    </div>
  );
}
