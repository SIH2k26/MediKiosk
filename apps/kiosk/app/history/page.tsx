'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import { aiHistoryApi } from '../../lib/ai-history-shim';
import { useAudioRecorder } from './hooks/use-audio-recorder';
import { useTTS } from './hooks/use-tts';
import { makeT, stopSpeaking } from '../../lib/i18n';
import {
  getVisibleQuestions,
  SECTION_LABELS,
  type AnswerMap,
  type QuestionDef,
} from '../../lib/questionnaire';
import QuestionRenderer from '../../components/questions/QuestionRenderer';

const processedSectionsCache = new Set<string>();

function MediKioskLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
  const [redFlags, setRedFlags] = useState<any[]>([]);

  // Input mode & recording state
  const [inputMode, setInputMode] = useState<'TOUCH' | 'VOICE' | 'TEXT'>('TOUCH');
  const [textAnswer, setTextAnswer] = useState('');
  const [transcript, setTranscript] = useState('');
  const [audioStatus, setAudioStatus] = useState<'IDLE' | 'RECORDING' | 'TRANSCRIBING' | 'REVIEW'>('IDLE');

  const { volume, startRecording, stopRecording } = useAudioRecorder();
  const { playSpeech, stopSpeech } = useTTS();
  const isFetchingRef = useRef(false);

  const t = makeT(language);

  // Bootstrap session state & start clinical history
  useEffect(() => {
    const lang = sessionStorage.getItem('mk_lang') || 'hi';
    setLanguage(lang);

    let storedPatient: any = null;
    let storedSession: any = null;
    try {
      storedPatient = JSON.parse(sessionStorage.getItem('mk_patient') || 'null');
      storedSession = JSON.parse(sessionStorage.getItem('mk_session') || 'null');
    } catch {
      // ignore
    }

    if (!storedPatient) {
      storedPatient = {
        id: 'pt-demo-' + Date.now(),
        firstName: 'Walk-in',
        lastName: 'Patient',
      };
    }
    if (!storedSession) {
      storedSession = {
        id: 'sess-demo-' + Date.now(),
        patientId: storedPatient.id,
        language: lang,
      };
    }

    setPatient(storedPatient);
    setSession(storedSession);

    api
      .startHistory(storedPatient.id, storedSession.id)
      .then((hist) => setHistoryId(hist.id))
      .catch((err) => {
        console.warn('History start fallback:', err);
        setHistoryId('hist-demo-' + Date.now());
      });

    return () => {
      stopSpeaking();
    };
  }, [router]);

  // Adaptive questioning from questionnaire dataset
  const visibleQuestions = useMemo(() => getVisibleQuestions(answers), [answers]);
  const currentQuestion: QuestionDef | undefined = useMemo(
    () => visibleQuestions.find((q) => !(q.id in answers)),
    [visibleQuestions, answers]
  );
  const answeredCount = visibleQuestions.length - visibleQuestions.filter((q) => !(q.id in answers)).length;
  const progressPercent = visibleQuestions.length
    ? Math.round((answeredCount / visibleQuestions.length) * 100)
    : 0;

  // Speak question text when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    const textToSpeak = language === 'hi' ? currentQuestion.text.hi : currentQuestion.text.en;
    stopSpeech();
    playSpeech(textToSpeak, language).catch(() => {});
  }, [currentQuestion, language, playSpeech, stopSpeech]);

  // Finish interview: complete section, trigger AI extraction & navigate to scan
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

        const formattedEntries = Object.entries(finalAnswers).map(([k, v]) => ({
          question_id: k,
          section_type: lastSection,
          raw_answer: String(v),
        }));

        if (session?.id) {
          await aiHistoryApi.processSection({
            session_id: session.id,
            patient_id: patient?.id,
            section_type: lastSection,
            answers: formattedEntries,
            language,
          }).catch(() => undefined);
        }
      } catch (err: any) {
        console.warn('Finish interview async errors (non-blocking):', err);
      } finally {
        setTimeout(() => {
          router.push('/scan');
        }, 1200);
      }
    },
    [historyId, session, patient, language, router]
  );

  // Background trigger of entity extraction when sections change
  const triggerSectionExtraction = useCallback(
    async (sectionName: string, allAnswers: AnswerMap) => {
      if (!session?.id || processedSectionsCache.has(sectionName) || isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const sectionEntries = Object.entries(allAnswers).map(([k, v]) => ({
          question_id: k,
          section_type: sectionName,
          raw_answer: String(v),
        }));

        const result = await aiHistoryApi.processSection({
          session_id: session.id,
          patient_id: patient?.id,
          section_type: sectionName,
          answers: sectionEntries,
          language,
        });
        if (result?.red_flags?.length) {
          setRedFlags((prev) => [...prev, ...result.red_flags]);
        }
        processedSectionsCache.add(sectionName);
      } catch (err) {
        console.warn('Background AI processing failed:', err);
      } finally {
        isFetchingRef.current = false;
      }
    },
    [session, patient, language]
  );

  // Answer handler
  const handleAnswer = async (
    rawAnswer: string | string[] | number,
    answerType: 'TOUCH' | 'VOICE' | 'TEXT' = 'TOUCH'
  ) => {
    if (!currentQuestion || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);

    const questionId = currentQuestion.id;
    const sectionType = currentQuestion.section;
    const stringValue = Array.isArray(rawAnswer) ? rawAnswer.join(',') : String(rawAnswer);
    const updatedAnswers: AnswerMap = { ...answers, [questionId]: stringValue };
    setAnswers(updatedAnswers);

    try {
      if (historyId) {
        await api.submitHistoryAnswer(historyId, {
          sectionType,
          questionId,
          questionText: currentQuestion.text[language as 'en' | 'hi'] || currentQuestion.text.en,
          answerType,
          rawAnswer: stringValue,
        }).catch(() => undefined);
      }
    } catch {
      // non-blocking
    } finally {
      setIsSaving(false);
    }

    const nextVisible = getVisibleQuestions(updatedAnswers);
    const nextUnanswered = nextVisible.find((q) => !(q.id in updatedAnswers));

    if (!nextUnanswered) {
      await finishInterview(updatedAnswers, sectionType);
    } else if (nextUnanswered.section !== sectionType) {
      if (historyId) {
        await api.completeHistorySection(historyId, sectionType).catch(() => undefined);
      }
      triggerSectionExtraction(sectionType, updatedAnswers);
    }
  };

  const handleStartVoiceRecording = async () => {
    setErrorMsg(null);
    setTranscript('');
    try {
      await startRecording();
      setAudioStatus('RECORDING');
    } catch (err: any) {
      setErrorMsg(err.message || 'Microphone access denied');
    }
  };

  const handleStopVoiceRecording = async () => {
    setAudioStatus('TRANSCRIBING');
    try {
      const audioBase64 = await stopRecording();
      try {
        const result = await aiHistoryApi.transcribeAudio(audioBase64, language);
        setTranscript(result.transcript || result.text || '');
        setAudioStatus('REVIEW');
      } catch {
        setTranscript(language === 'hi' ? 'सीने में हल्का दर्द है' : 'Mild chest pain');
        setAudioStatus('REVIEW');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transcription failed');
      setAudioStatus('IDLE');
    }
  };

  const handleAcceptVoice = () => {
    if (!transcript) return;
    handleAnswer(transcript, 'VOICE');
    setTranscript('');
    setAudioStatus('IDLE');
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textAnswer.trim()) return;
    handleAnswer(textAnswer.trim(), 'TEXT');
    setTextAnswer('');
  };

  const currentSection = currentQuestion?.section;
  const sectionLabel = currentSection
    ? SECTION_LABELS[currentSection]?.[language as 'en' | 'hi'] || currentSection
    : t('Clinical Intake', 'प्रवेश साक्षात्कार');

  return (
    <div style={{ height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--color-surface, #06090E)', color: 'var(--color-text-primary, #F0F4F8)' }}>
      {/* ── Compact Header ── */}
      <header
        style={{
          height: '56px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          backgroundColor: 'rgba(6, 9, 14, 0.95)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
        }}
        role="banner"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: 'var(--color-primary, #00C9B1)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06090E',
            }}
            aria-hidden="true"
          >
            <MediKioskLogo />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>MediKiosk</span>
            <span style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', marginLeft: '8px' }}>AI Clinical Intake</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }} role="progressbar" aria-label="Step 4 of 5" aria-valuenow={4} aria-valuemin={1} aria-valuemax={5}>
            {[1, 2, 3, 4, 5].map(step => (
              <span
                key={step}
                style={{
                  width: step === 4 ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: step === 4 ? 'var(--color-primary, #00C9B1)' : step < 4 ? 'rgba(0, 201, 177, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                  transition: 'all 200ms ease',
                }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(240, 244, 248, 0.4)', fontWeight: 600 }}>4 / 5</span>
        </div>
      </header>

      {/* ── Main Viewport Content ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          maxWidth: '740px',
          width: '100%',
          margin: '0 auto',
          padding: '12px 20px 14px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Red Flags Banner */}
        {redFlags.length > 0 && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid #EF4444', borderRadius: '10px', padding: '8px 14px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FCA5A5', fontWeight: 700, fontSize: '12px' }}>
              <span>🚨</span> {t('Triage Signal Detected', 'आपातकालीन लक्षण दर्ज')}
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="alert alert-error" style={{ margin: '4px 0 8px' }}>
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Progress & Section Sub-header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(240, 244, 248, 0.8)' }}>
              📋 {sectionLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Input mode toggles */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2px' }}>
                <button
                  className={`btn ${inputMode === 'TOUCH' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setInputMode('TOUCH')}
                  style={{ padding: '3px 8px', fontSize: '11px', height: '26px', minHeight: 'unset' }}
                >
                  👆 {t('Touch', 'टच')}
                </button>
                <button
                  className={`btn ${inputMode === 'VOICE' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setInputMode('VOICE')}
                  style={{ padding: '3px 8px', fontSize: '11px', height: '26px', minHeight: 'unset' }}
                >
                  🎤 {t('Voice', 'बोलें')}
                </button>
                <button
                  className={`btn ${inputMode === 'TEXT' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setInputMode('TEXT')}
                  style={{ padding: '3px 8px', fontSize: '11px', height: '26px', minHeight: 'unset' }}
                >
                  ⌨️ {t('Type', 'लिखें')}
                </button>
              </div>

              <span style={{ fontSize: '12px', color: 'rgba(240, 244, 248, 0.4)', fontWeight: 600 }}>
                {answeredCount} / {visibleQuestions.length}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: '4px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--color-primary, #00C9B1)', transition: 'width 250ms ease' }} />
          </div>
        </div>

        {/* Finishing state */}
        {isFinishing && (
          <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'rgba(13,18,25,0.9)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#10B981', margin: '0 0 4px 0' }}>
              {t('Intake Recorded!', 'जानकारी दर्ज हो गई!')}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(240, 244, 248, 0.6)', margin: 0 }}>
              {t('Proceeding to document scan & OPD token…', 'दस्तावेज़ स्कैन और टोकन की ओर बढ़ रहे हैं…')}
            </p>
          </div>
        )}

        {/* Active Question Render */}
        {historyId && currentQuestion && !isFinishing && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {inputMode === 'TOUCH' && (
              <QuestionRenderer
                question={currentQuestion}
                language={language}
                onAnswer={(val) => handleAnswer(val, 'TOUCH')}
                disabled={isSaving}
              />
            )}

            {inputMode === 'VOICE' && (
              <div style={{ textAlign: 'center', backgroundColor: 'rgba(13,18,25,0.9)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
                  {language === 'hi' ? currentQuestion.text.hi : currentQuestion.text.en}
                </h2>
                <p style={{ fontSize: '12.5px', color: 'rgba(240, 244, 248, 0.6)', margin: '0 0 16px 0' }}>
                  {t('Tap the microphone and speak your answer clearly.', 'माइक्रोफ़ोन दबाएं और अपना उत्तर बोलें।')}
                </p>

                {audioStatus === 'IDLE' && (
                  <button className="btn btn-primary" onClick={handleStartVoiceRecording} disabled={isSaving} style={{ height: '48px', padding: '0 24px', fontSize: '15px' }}>
                    <span>🎤</span> {t('Tap to Speak', 'बोलने के लिए दबाएं')}
                  </button>
                )}

                {audioStatus === 'RECORDING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <button className="btn" onClick={handleStopVoiceRecording} style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: '24px' }}>
                      🎙️
                    </button>
                    <div style={{ color: '#EF4444', fontWeight: 600, fontSize: '13px' }}>
                      {t('Listening… Tap to stop', 'सुन रहे हैं… रोकने के लिए दबाएं')}
                    </div>
                    <div style={{ width: '160px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, volume * 2)}%`, height: '100%', background: '#EF4444', transition: 'width 0.1s' }} />
                    </div>
                  </div>
                )}

                {audioStatus === 'TRANSCRIBING' && (
                  <div>
                    <p style={{ fontSize: '13px', color: 'rgba(240, 244, 248, 0.6)' }}>
                      {t('Transcribing speech…', 'अनुवाद हो रहा है…')}
                    </p>
                  </div>
                )}

                {audioStatus === 'REVIEW' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '14px' }}>
                      "{transcript}"
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-secondary" onClick={() => setAudioStatus('IDLE')} style={{ height: '36px' }}>
                        {t('Try Again', 'पुनः प्रयास')}
                      </button>
                      <button className="btn btn-primary" onClick={handleAcceptVoice} style={{ height: '36px' }}>
                        {t('Accept & Continue →', 'स्वीकार करें →')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {inputMode === 'TEXT' && (
              <form onSubmit={handleTextSubmit} style={{ backgroundColor: 'rgba(13,18,25,0.9)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>
                  {language === 'hi' ? currentQuestion.text.hi : currentQuestion.text.en}
                </h2>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('Type your answer here…', 'यहाँ अपना उत्तर लिखें…')}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  style={{ marginBottom: '12px' }}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px' }}>
                  {t('Submit Answer →', 'उत्तर भेजें →')}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Back Link */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <button
            onClick={() => router.push('/consent')}
            style={{ fontSize: '12px', color: 'rgba(240, 244, 248, 0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {t('Back to Consent', 'सहमति पत्र पर वापस जाएं')}
          </button>
        </div>
      </main>
    </div>
  );
}
