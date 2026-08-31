'use client';

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

const compactButtonStyle: React.CSSProperties = {
  minHeight: '48px',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

// ------------------------------- YES / NO -----------------------------------

export function YesNoInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <button className="btn btn-primary" style={compactButtonStyle} disabled={disabled} onClick={() => onAnswer('yes')}>
        ✅ {t('Yes', 'हां')}
      </button>
      <button className="btn btn-secondary" style={compactButtonStyle} disabled={disabled} onClick={() => onAnswer('no')}>
        ❌ {t('No', 'नहीं')}
      </button>
    </div>
  );
}

// ---------------------------- SINGLE CHOICE ---------------------------------

export function SingleChoiceInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }} role="radiogroup">
      {(question.options || []).map((opt) => (
        <button
          key={opt.value}
          className="choose-card"
          style={{ minHeight: '56px', padding: '10px 14px', alignItems: 'center', flexDirection: 'row', gap: '8px' }}
          disabled={disabled}
          onClick={() => onAnswer(opt.value)}
          role="radio"
          aria-checked={false}
        >
          {opt.emoji && <span style={{ fontSize: '18px' }} aria-hidden="true">{opt.emoji}</span>}
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#F0F4F8' }}>{optionLabel(opt, language)}</span>
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
      if (value === 'none') return prev.includes('none') ? [] : ['none'];
      const next = prev.filter((v) => v !== 'none');
      return next.includes(value) ? next.filter((v) => v !== value) : [...next, value];
    });
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {(question.options || []).map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              className={`choose-card ${isSelected ? 'choose-card-highlight' : ''}`}
              style={{ minHeight: '56px', padding: '10px 14px', alignItems: 'center', flexDirection: 'row', gap: '8px' }}
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              role="checkbox"
              aria-checked={isSelected}
            >
              {opt.emoji && <span style={{ fontSize: '18px' }} aria-hidden="true">{opt.emoji}</span>}
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#F0F4F8' }}>{optionLabel(opt, language)}</span>
            </button>
          );
        })}
      </div>
      <button
        className="btn btn-primary"
        style={{ width: '100%', height: '42px', fontSize: '14px', fontWeight: 700 }}
        disabled={selected.length === 0 || disabled}
        onClick={() => onAnswer(selected.join(','))}
      >
        {t('Continue →', 'आगे बढ़ें →')}
      </button>
    </div>
  );
}

// ------------------------------- NUMBER -------------------------------------

export function NumberInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [val, setVal] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val) onAnswer(val); }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="number"
          className="form-input"
          min={question.min ?? 0}
          max={question.max ?? 999}
          placeholder={t('Enter number…', 'संख्या दर्ज करें…')}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          autoFocus
          required
        />
        <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 20px' }} disabled={!val || disabled}>
          {t('Next →', 'आगे →')}
        </button>
      </div>
    </form>
  );
}

// -------------------------------- DATE --------------------------------------

export function DateInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [val, setVal] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val) onAnswer(val); }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="date"
          className="form-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          autoFocus
          required
        />
        <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 20px' }} disabled={!val || disabled}>
          {t('Next →', 'आगे →')}
        </button>
      </div>
    </form>
  );
}

// -------------------------------- TEXT --------------------------------------

export function TextInput({ question, language, onAnswer, disabled }: QuestionInputProps) {
  const t = makeT(language);
  const [val, setVal] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val) onAnswer(val); }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          className="form-input"
          placeholder={t('Type your answer…', 'यहाँ लिखें…')}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          disabled={disabled}
          autoFocus
          required
        />
        <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 20px' }} disabled={!val || disabled}>
          {t('Next →', 'आगे →')}
        </button>
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
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '8px' }}>
        {values.map((v) => (
          <button
            key={v}
            className="choose-card"
            style={{ minHeight: '44px', padding: '6px', fontSize: '15px', fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}
            disabled={disabled}
            onClick={() => onAnswer(String(v))}
            aria-label={`${v} / ${max}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)' }}>
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
    <div
      style={{
        backgroundColor: 'rgba(13, 18, 25, 0.94)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 20px',
      }}
      key={question.id}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, lineHeight: 1.35, margin: 0 }}>
          {questionText}
        </h2>
        <button
          className="btn btn-secondary"
          style={{ height: '32px', padding: '0 10px', borderRadius: '9999px', flexShrink: 0, fontSize: '13px' }}
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
