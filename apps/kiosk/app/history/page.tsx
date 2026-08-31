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

// Module-level cache to prevent double-processing on re-renders
const processedSectionsCache = new Set<string>();

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

  const { isRecording, volume, startRecording, stopRecording } = useAudioRecorder();
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

    // Default fallback for dev/demo if not navigated via intake flow
    if (!storedPatient) {
      storedPatient = {
        id: '00000000-0000-0000-0000-000000000001',
        firstName: 'Demo',
        lastName: 'Patient',
      };
    }
    if (!storedSession) {
      storedSession = {
        id: '00000000-0000-0000-0000-000000000002',
        patientId: storedPatient.id,
      };
    }

    setPatient(storedPatient);
    setSession(storedSession);

    api
      .startHistory(storedPatient.id, storedSession.id)
      .then((hist) => setHistoryId(hist.id))
      .catch((err) => {
        console.warn('History start fallback:', err);
        setHistoryId('00000000-0000-0000-0000-000000000003');
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
      } finally {
        stopSpeaking();
        // Check if patient wants to upload documents or go straight to token
        router.push('/scan');
      }
    },
    [historyId, session, router]
  );

  // Submit an answer (via Touch, Voice, or Text)
  const handleAnswer = async (value: string, answerType: 'TOUCH' | 'VOICE' | 'TEXT' = 'TOUCH') => {
    if (!currentQuestion || !value.trim() || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    stopSpeaking();

    const question = currentQuestion;
    const trimmedVal = value.trim();

    try {
      if (historyId) {
        await api.submitHistoryAnswer(historyId, {
          sectionType: question.section,
          questionId: question.id,
          questionText: question.text.en,
          answerType: answerType,
          rawAnswer: trimmedVal,
        }).catch(() => undefined);
      }

      const nextAnswers = { ...answers, [question.id]: trimmedVal };
      setAnswers(nextAnswers);
      setTextAnswer('');
      setTranscript('');
      setAudioStatus('IDLE');
      setInputMode('TOUCH');

      // Check section transition
      const nextVisible = getVisibleQuestions(nextAnswers);
      const nextQuestion = nextVisible.find((q) => !(q.id in nextAnswers));

      // Trigger background AI processing for the section if transitioning
      if (!nextQuestion || nextQuestion.section !== question.section) {
        const currentSec = question.section;
        if (!processedSectionsCache.has(currentSec)) {
          processedSectionsCache.add(currentSec);
          // Format section answers for AI history service
          const sectionAnswers = Object.entries(nextAnswers).map(([qid, ans]) => ({
            question_id: qid,
            question_text: qid,
            answer_type: answerType,
            raw_answer: ans,
            section_type: currentSec,
          }));

          aiHistoryApi
            .processSection({
              session_id: session?.id || '00000000-0000-0000-0000-000000000002',
              patient_id: patient?.id || '00000000-0000-0000-0000-000000000001',
              language,
              section_type: currentSec,
              answers: sectionAnswers,
            })
            .then((res) => {
              if (res.red_flags && res.red_flags.length > 0) {
                setRedFlags((prev) => {
                  const existingTypes = new Set(prev.map((f) => f.type));
                  const newFlags = res.red_flags.filter((f: any) => !existingTypes.has(f.type));
                  return [...prev, ...newFlags];
                });
              }
            })
            .catch((e) => console.warn('AI section processing error:', e));
        }

        if (historyId) {
          await api.completeHistorySection(historyId, currentSec).catch(() => undefined);
        }
      }

      if (!nextQuestion) {
        await finishInterview(nextAnswers, question.section);
        return;
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('Could not save your answer. Please try again.', 'उत्तर सहेजने में विफल। पुनः प्रयास करें।'));
    } finally {
      setIsSaving(false);
    }
  };

  // Voice recording handlers
  const handleStartVoiceRecording = async () => {
    try {
      stopSpeech();
      await startRecording(handleStopVoiceRecording);
      setAudioStatus('RECORDING');
    } catch (e) {
      console.error('Microphone access error:', e);
      setErrorMsg(t('Could not access microphone.', 'माइक्रोफ़ोन उपलब्ध नहीं है।'));
    }
  };

  const handleStopVoiceRecording = async () => {
    setAudioStatus('TRANSCRIBING');
    try {
      const audioBase64 = await stopRecording();
      if (!audioBase64) {
        setAudioStatus('IDLE');
        return;
      }
      const res = await aiHistoryApi.transcribeAudio(audioBase64, language);
      setTranscript(res.transcript || '');
      setAudioStatus('REVIEW');
    } catch (e) {
      console.error('ASR error:', e);
      setAudioStatus('IDLE');
      setErrorMsg(t('Could not transcribe audio. You may type your answer instead.', 'ऑडियो अनुवाद विफल। आप टाइप कर सकते हैं।'));
    }
  };

  const sectionLabel = currentQuestion
    ? language === 'hi'
      ? SECTION_LABELS[currentQuestion.section]?.hi || currentQuestion.section
      : SECTION_LABELS[currentQuestion.section]?.en || currentQuestion.section
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

      <div className="kiosk-container" style={{ paddingTop: '100px', maxWidth: '780px' }}>
        {/* Real-time Red Flags Banner */}
        {redFlags.length > 0 && (
          <div
            className="fade-in-up"
            style={{
              background: 'rgba(217, 48, 37, 0.15)',
              border: '1px solid var(--color-emergency)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FF8A80', fontWeight: 700, marginBottom: '0.5rem' }}>
              <span>🚨</span> {t('Triage Red Flag Detected', 'आपातकालीन लक्षण दर्ज')}
            </div>
            <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              {redFlags.map((rf, i) => (
                <li key={i}>
                  <strong>{rf.type}</strong>: {rf.description}
                </li>
              ))}
            </ul>
          </div>
        )}

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

        {/* Progress & Section Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="text-body text-secondary" style={{ fontWeight: 600 }}>
              📋 {sectionLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Input mode toggles */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
                <button
                  className={`btn btn-sm ${inputMode === 'TOUCH' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setInputMode('TOUCH')}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                >
                  👆 {t('Touch', 'टच')}
                </button>
                <button
                  className={`btn btn-sm ${inputMode === 'VOICE' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setInputMode('VOICE')}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                >
                  🎤 {t('Voice', 'बोलें')}
                </button>
                <button
                  className={`btn btn-sm ${inputMode === 'TEXT' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setInputMode('TEXT')}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                >
                  ⌨️ {t('Type', 'लिखें')}
                </button>
              </div>

              <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                {answeredCount} / {visibleQuestions.length}
              </span>
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: '8px',
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
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Loading / Finishing / Question display */}
        {!historyId && !errorMsg && (
          <div className="card fade-in-up" style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-body text-secondary">
              {t('Preparing your clinical interview…', 'आपका साक्षात्कार तैयार हो रहा है…')}
            </p>
          </div>
        )}

        {isFinishing && (
          <div className="card fade-in-up" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 className="text-display" style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>
              {t('Intake Recorded!', 'जानकारी दर्ज हो गई!')}
            </h2>
            <p className="text-body text-secondary">
              {t('Proceeding to document scan & OPD token…', 'दस्तावेज़ स्कैन और टोकन की ओर बढ़ रहे हैं…')}
            </p>
          </div>
        )}

        {/* Active Question Render */}
        {historyId && currentQuestion && !isFinishing && (
          <div>
            {inputMode === 'TOUCH' && (
              <QuestionRenderer
                question={currentQuestion}
                language={language}
                onAnswer={(val) => handleAnswer(val, 'TOUCH')}
                disabled={isSaving}
              />
            )}

            {inputMode === 'VOICE' && (
              <div className="card fade-in-up" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <h2 className="text-heading" style={{ marginBottom: '0.75rem' }}>
                  {language === 'hi' ? currentQuestion.text.hi : currentQuestion.text.en}
                </h2>
                <p className="text-body text-secondary" style={{ marginBottom: '2rem' }}>
                  {t('Tap the microphone and speak your answer clearly.', 'माइक्रोफ़ोन दबाएं और अपना उत्तर स्पष्ट रूप से बोलें।')}
                </p>

                {audioStatus === 'IDLE' && (
                  <button className="btn btn-primary btn-xl" onClick={handleStartVoiceRecording} disabled={isSaving}>
                    <span style={{ fontSize: '1.8rem' }}>🎤</span> {t('Tap to Speak', 'बोलने के लिए दबाएं')}
                  </button>
                )}

                {audioStatus === 'RECORDING' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <button className="mic-button recording" onClick={handleStopVoiceRecording}>
                      <span style={{ fontSize: '2rem' }}>🎙️</span>
                    </button>
                    <div style={{ color: 'var(--color-emergency)', fontWeight: 600 }}>
                      {t('Listening… Tap to stop', 'सुन रहे हैं… रोकने के लिए दबाएं')}
                    </div>
                    <div style={{ width: '200px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, volume * 2)}%`, height: '100%', background: 'var(--color-emergency)', transition: 'width 0.1s' }} />
                    </div>
                  </div>
                )}

                {audioStatus === 'TRANSCRIBING' && (
                  <div>
                    <span className="spinner" />
                    <p className="text-body text-secondary" style={{ marginTop: '1rem' }}>
                      {t('Transcribing speech…', 'आवाज़ का अनुवाद हो रहा है…')}
                    </p>
                  </div>
                )}

                {audioStatus === 'REVIEW' && (
                  <div className="fade-in-up" style={{ textAlign: 'left', marginTop: '1rem' }}>
                    <label className="text-body text-secondary" style={{ display: 'block', marginBottom: '0.5rem' }}>
                      {t('Recognized Speech (You can edit before confirming):', 'पहचानी गई आवाज़:')}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}
                    />
                    <div className="btn-row">
                      <button className="btn btn-secondary" onClick={() => setAudioStatus('IDLE')}>
                        {t('Record Again', 'दोबारा बोलें')}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAnswer(transcript, 'VOICE')}
                        disabled={!transcript.trim()}
                      >
                        {t('Confirm Answer →', 'पुष्टि करें →')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {inputMode === 'TEXT' && (
              <div className="card fade-in-up" style={{ padding: '2.5rem' }}>
                <h2 className="text-heading" style={{ marginBottom: '0.75rem' }}>
                  {language === 'hi' ? currentQuestion.text.hi : currentQuestion.text.en}
                </h2>
                <p className="text-body text-secondary" style={{ marginBottom: '1.5rem' }}>
                  {t('Type your answer in your preferred language:', 'अपनी पसंदीदा भाषा में उत्तर लिखें:')}
                </p>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder={t('e.g. 3 days of mild fever with headache...', 'उदा. 3 दिनों से हल्का बुखार और सिरदर्द...')}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  style={{ width: '100%', fontSize: '1.1rem', marginBottom: '1.5rem', resize: 'vertical' }}
                  autoFocus
                />
                <div className="btn-row">
                  <button className="btn btn-secondary" onClick={() => setInputMode('TOUCH')}>
                    {t('Use Touch Buttons', 'टच बटन का उपयोग करें')}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAnswer(textAnswer, 'TEXT')}
                    disabled={!textAnswer.trim() || isSaving}
                  >
                    {isSaving ? t('Saving…', 'सहेजा जा रहा है…') : t('Submit Answer →', 'उत्तर भेजें →')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
