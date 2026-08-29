'use client';

// =============================================================================
// Touch-based structured clinical history interview
// =============================================================================
// Drives the declarative questionnaire (lib/questionnaire.ts) through the
// reusable touch question components. Answers are persisted per question and
// sections are marked complete as the patient progresses. Voice input
// (Bhashini ASR) will be layered on in Phase 3.
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import { makeT, stopSpeaking } from '../../lib/i18n';
import {
  getVisibleQuestions,
  SECTION_LABELS,
  type AnswerMap,
  type QuestionDef,
} from '../../lib/questionnaire';
import QuestionRenderer from '../../components/questions/QuestionRenderer';

export default function HistoryPage() {
  const router = useRouter();

  const [language, setLanguage] = useState('hi');
  const [patient, setPatient] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = makeT(language);

  // Bootstrap: load kiosk state and start (or resume) the clinical history
  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);

    let storedPatient: any = null;
    let storedSession: any = null;
    try {
      storedPatient = JSON.parse(sessionStorage.getItem('mk_patient') || 'null');
      storedSession = JSON.parse(sessionStorage.getItem('mk_session') || 'null');
    } catch {
      // fallthrough to redirect
    }
    if (!storedPatient || !storedSession) {
      router.push('/');
      return;
    }
    setPatient(storedPatient);
    setSession(storedSession);

    api
      .startHistory(storedPatient.id, storedSession.id)
      .then((history) => setHistoryId(history.id))
      .catch((err) => setErrorMsg(err.message || 'Could not start the interview.'));

    return () => stopSpeaking();
  }, [router]);

  // Adaptive questioning: visible questions depend on previous answers
  const visibleQuestions = useMemo(() => getVisibleQuestions(answers), [answers]);
  const currentQuestion: QuestionDef | undefined = useMemo(
    () => visibleQuestions.find((q) => !(q.id in answers)),
    [visibleQuestions, answers]
  );
  const answeredCount = visibleQuestions.length - visibleQuestions.filter((q) => !(q.id in answers)).length;
  const progressPercent = visibleQuestions.length
    ? Math.round((answeredCount / visibleQuestions.length) * 100)
    : 0;

  // Finish: close remaining bookkeeping and show the OPD token screen
  const finishInterview = useCallback(
    async (finalAnswers: AnswerMap, lastSection: string) => {
      setIsFinishing(true);
      try {
        if (historyId) {
          await api.completeHistorySection(historyId, lastSection).catch(() => undefined);
        }
        if (session) {
          await api.completeSession(session.id).catch(() => undefined);
        }
      } finally {
        stopSpeaking();
        router.push('/token');
      }
    },
    [historyId, session, router]
  );

  const handleAnswer = async (value: string) => {
    if (!currentQuestion || !historyId || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    stopSpeaking();

    const question = currentQuestion;
    try {
      await api.submitHistoryAnswer(historyId, {
        sectionType: question.section,
        questionId: question.id,
        questionText: question.text.en, // canonical English text for clinical records
        answerType: 'TOUCH',
        rawAnswer: value,
      });

      const nextAnswers = { ...answers, [question.id]: value };
      setAnswers(nextAnswers);

      // Section transition bookkeeping
      const nextVisible = getVisibleQuestions(nextAnswers);
      const nextQuestion = nextVisible.find((q) => !(q.id in nextAnswers));

      if (!nextQuestion) {
        await finishInterview(nextAnswers, question.section);
        return;
      }
      if (nextQuestion.section !== question.section) {
        await api.completeHistorySection(historyId, question.section).catch(() => undefined);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save your answer. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const sectionLabel = currentQuestion
    ? language === 'hi'
      ? SECTION_LABELS[currentQuestion.section].hi
      : SECTION_LABELS[currentQuestion.section].en
    : '';

  return (
    <main className="kiosk-screen">
      {/* Header */}
      <header className="kiosk-header">
        <div className="logo">
          <div className="logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4L24 10V18L14 24L4 18V10L14 4Z" stroke="white" strokeWidth="1.5" />
              <path d="M14 11V17M11 14H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="logo-text">MediKiosk</div>
            <div className="logo-tagline">AI Clinical Intake</div>
          </div>
        </div>

        <div className="step-indicator" aria-label="Step 4 of 5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`step-dot ${step === 4 ? 'active' : step < 4 ? 'completed' : ''}`}
            />
          ))}
        </div>
      </header>

      <div className="kiosk-container" style={{ paddingTop: '100px', maxWidth: '760px' }}>
        {/* Error message */}
        {errorMsg && (
          <div
            className="fade-in-up"
            style={{
              background: 'rgba(217, 48, 37, 0.12)',
              border: '1px solid var(--color-emergency)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              color: '#FF8A80',
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="text-body text-secondary" style={{ fontWeight: 600 }}>
              📋 {sectionLabel}
            </span>
            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
              {answeredCount} / {visibleQuestions.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: '10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Question / loading / finishing states */}
        {!historyId && !errorMsg && (
          <div className="card fade-in-up" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-body text-secondary">
              {t('Preparing your interview…', 'आपका साक्षात्कार तैयार हो रहा है…')}
            </p>
          </div>
        )}

        {isFinishing && (
          <div className="card fade-in-up" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">✅</div>
            <p className="text-body text-secondary">
              {t('Thank you! Finalizing your intake…', 'धन्यवाद! आपकी जानकारी पूरी हो रही है…')}
            </p>
          </div>
        )}

        {historyId && currentQuestion && !isFinishing && (
          <QuestionRenderer
            question={currentQuestion}
            language={language}
            onAnswer={handleAnswer}
            disabled={isSaving}
          />
        )}
      </div>
    </main>
  );
}
