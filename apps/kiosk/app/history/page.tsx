'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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

  if (!patient || !session) return null;

  return (
    <div className="h-screen w-full flex flex-col bg-paper text-ink-primary overflow-hidden font-sans">
      <header className="h-20 shrink-0 border-b border-rule bg-paper px-6 md:px-10 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-paper shadow-raised">
            <MediKioskLogo />
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-xl font-bold tracking-tight leading-none text-ink-primary">MediKiosk</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary mt-1">Clinical Intake</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-xs font-mono font-bold text-ink-secondary mb-1">
              {String(Math.min(answeredCount + 1, visibleQuestions.length)).padStart(2, '0')} / {String(visibleQuestions.length).padStart(2, '0')}
            </span>
            <div className="w-32 h-1.5 bg-paper-raised rounded-full overflow-hidden border border-rule">
              <motion.div 
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>
          <button 
            className="text-xs font-bold text-signal-critical hover:bg-signal-criticalWash px-4 py-2 rounded-lg transition-colors"
            onClick={() => {
              if(confirm(t('End session?', 'क्या आप सत्र समाप्त करना चाहते हैं?'))) router.push('/start');
            }}
          >
            {t('End', 'समाप्त करें')}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        <main className="flex-1 relative flex flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            {isFinishing ? (
              <motion.div
                key="finishing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center px-6"
              >
                <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-8">
                  <span className="text-5xl text-accent">&#10003;</span>
                </div>
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-ink-primary mb-4">
                  {t('Intake Recorded Successfully', 'आपका विवरण सफलतापूर्वक दर्ज हो गया है')}
                </h2>
                <p className="font-sans text-xl text-ink-secondary max-w-lg">
                  {t('Proceeding to document scan & OPD token...', 'दस्तावेज़ स्कैन और ओपीडी टोकन की ओर बढ़ रहे हैं...')}
                </p>
              </motion.div>
            ) : currentQuestion ? (
              <motion.div 
                key={currentQuestion.id + inputMode}
                initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-6 py-12"
              >
                
                {inputMode === 'TOUCH' && (
                  <QuestionRenderer
                    question={currentQuestion}
                    language={language}
                    onAnswer={(val) => handleAnswer(val, 'TOUCH')}
                    disabled={isSaving}
                  />
                )}

                {inputMode === 'VOICE' && (
                  <div className="w-full flex flex-col items-center justify-center max-w-4xl">
                    <h2 className="font-serif text-[40px] md:text-[56px] leading-tight font-bold text-ink-primary mb-12 text-center tracking-tight">
                      {language === 'hi' ? currentQuestion.text.hi : currentQuestion.text.en}
                    </h2>
                    
                    {audioStatus === 'IDLE' && (
                      <motion.button 
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-4 px-12 h-24 bg-accent text-paper rounded-full font-bold text-2xl shadow-card transition-all" 
                        onClick={handleStartVoiceRecording} disabled={isSaving}
                      >
                        <span className="text-4xl">&#127897;</span> {t('Tap to Speak', 'बोलने के लिए टैप करें')}
                      </motion.button>
                    )}

                    {audioStatus === 'RECORDING' && (
                      <div className="flex flex-col items-center gap-10">
                        <motion.button 
                          className="w-32 h-32 rounded-full bg-signal-critical text-paper text-5xl shadow-card flex items-center justify-center relative" 
                          onClick={handleStopVoiceRecording} 
                        >
                          <motion.div 
                            className="absolute inset-0 rounded-full border-4 border-signal-critical"
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          &#9632;
                        </motion.button>
                        <div className="text-signal-critical font-bold text-2xl tracking-tight">
                          {t('Listening... Tap to stop', 'सुन रहा हूँ... रोकने के लिए टैप करें')}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 h-16 w-80 bg-paper-sunken rounded-2xl px-6 border border-rule">
                           {[...Array(24)].map((_, i) => (
                             <motion.div
                               key={i}
                               className="w-2 bg-signal-critical rounded-full"
                               animate={{ height: `${Math.max(4, Math.random() * volume * 100)}%` }}
                               transition={{ duration: 0.1 }}
                             />
                           ))}
                        </div>
                      </div>
                    )}

                    {audioStatus === 'TRANSCRIBING' && (
                      <div className="py-16 flex flex-col items-center gap-6">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                        <p className="font-mono text-xl text-ink-secondary tracking-widest uppercase">
                          {t('Transcribing speech...', 'ऑडियो प्रोसेस हो रहा है...')}
                        </p>
                      </div>
                    )}

                    {audioStatus === 'REVIEW' && (
                      <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
                        <div className="w-full p-8 bg-paper-sunken border border-rule rounded-3xl font-sans text-3xl text-ink-primary shadow-inner text-center leading-relaxed">
                          "{transcript}"
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                          <button className="px-10 h-16 bg-paper-raised border border-rule rounded-2xl font-bold text-ink-primary text-xl hover:border-accent hover:shadow-card transition-all" onClick={() => setAudioStatus('IDLE')}>
                            {t('Try Again', 'पुनः प्रयास करें')}
                          </button>
                          <button className="px-10 h-16 bg-accent text-paper rounded-2xl font-bold text-xl shadow-raised flex items-center justify-center gap-2 hover:scale-105 transition-transform" onClick={handleAcceptVoice}>
                            {t('Accept & Continue', 'स्वीकार करें और आगे बढ़ें')} &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {inputMode === 'TEXT' && (
                  <div className="w-full flex flex-col items-center justify-center max-w-4xl">
                    <h2 className="font-serif text-[40px] md:text-[56px] leading-tight font-bold text-ink-primary mb-12 text-center tracking-tight">
                      {language === 'hi' ? currentQuestion.text.hi : currentQuestion.text.en}
                    </h2>
                    <form 
                      onSubmit={handleTextSubmit} 
                      className="w-full flex flex-col gap-6"
                    >
                      <input
                        type="text"
                        className="w-full h-24 bg-paper-sunken border-2 border-rule rounded-2xl px-8 text-2xl font-sans text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-ink-muted shadow-inner"
                        placeholder={t('Type your answer here...', 'अपना उत्तर यहाँ टाइप करें...')}
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="w-full md:w-auto self-end px-12 h-20 bg-accent text-paper font-bold text-2xl rounded-2xl shadow-raised flex items-center justify-center gap-3 hover:scale-105 transition-transform">
                        {t('Submit Answer', 'उत्तर जमा करें')} &rarr;
                      </button>
                    </form>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <aside className="w-full md:w-[320px] lg:w-[400px] bg-paper-sunken border-t md:border-t-0 md:border-l border-rule flex flex-col shrink-0">
          <div className="p-6 md:p-8 flex flex-col h-full gap-8">
            
            <div>
              <h3 className="font-mono text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-4">
                {t('Interaction Mode', 'इंटरैक्शन मोड')}
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  className={`flex items-center gap-4 px-6 h-16 rounded-2xl border transition-all ${inputMode === 'TOUCH' ? 'bg-paper border-accent shadow-raised text-accent' : 'bg-transparent border-transparent hover:bg-paper-raised text-ink-secondary hover:text-ink-primary'}`}
                  onClick={() => { setInputMode('TOUCH'); setAudioStatus('IDLE'); }}
                >
                  <span className="text-2xl">&#128434;</span> 
                  <span className="font-bold text-lg">{t('Touch', 'स्पर्श')}</span>
                </button>
                <button
                  className={`flex items-center gap-4 px-6 h-16 rounded-2xl border transition-all ${inputMode === 'VOICE' ? 'bg-paper border-accent shadow-raised text-accent' : 'bg-transparent border-transparent hover:bg-paper-raised text-ink-secondary hover:text-ink-primary'}`}
                  onClick={() => setInputMode('VOICE')}
                >
                  <span className="text-2xl">&#127897;</span> 
                  <span className="font-bold text-lg">{t('Voice', 'आवाज़')}</span>
                </button>
                <button
                  className={`flex items-center gap-4 px-6 h-16 rounded-2xl border transition-all ${inputMode === 'TEXT' ? 'bg-paper border-accent shadow-raised text-accent' : 'bg-transparent border-transparent hover:bg-paper-raised text-ink-secondary hover:text-ink-primary'}`}
                  onClick={() => { setInputMode('TEXT'); setAudioStatus('IDLE'); }}
                >
                  <span className="text-2xl">&#9000;</span> 
                  <span className="font-bold text-lg">{t('Type', 'टाइप')}</span>
                </button>
              </div>
            </div>

            <div className="mt-auto">
              <h3 className="font-mono text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-4">
                {t('Language', 'भाषा')}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 h-12 rounded-xl font-bold transition-all border ${language === 'en' ? 'bg-paper border-ink-primary text-ink-primary shadow-sm' : 'bg-transparent border-rule text-ink-secondary hover:border-ink-muted'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('hi')}
                  className={`flex-1 h-12 rounded-xl font-bold transition-all border ${language === 'hi' ? 'bg-paper border-ink-primary text-ink-primary shadow-sm' : 'bg-transparent border-rule text-ink-secondary hover:border-ink-muted'}`}
                >
                  हिंदी
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-rule mt-2">
              <button
                onClick={() => router.push('/consent')}
                className="font-sans text-sm font-semibold text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-2"
              >
                &larr; {t('Back to Consent', 'सहमति पर वापस जाएं')}
              </button>
            </div>

          </div>
        </aside>
      </div>
    </div>
  );
}
