'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { aiHistoryApi } from '@/lib/ai-history-shim';
import { useAudioRecorder } from './hooks/use-audio-recorder';
import { useTTS } from './hooks/use-tts';
import { useRouter } from 'next/navigation';

// Module-level set to survive React Strict Mode unmounts and prevent double-processing
const globalProcessedSections = new Set<string>();

export default function HistoryPage() {
  const router = useRouter();
  
  const [session] = useState({ id: 'sess_' + Date.now(), patientId: 'p_123', lang: 'en' });
  const [currentSection, setCurrentSection] = useState('CHIEF_COMPLAINT');
  const [question, setQuestion] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [status, setStatus] = useState<'LOADING' | 'READY' | 'RECORDING' | 'PROCESSING' | 'REVIEW' | 'SECTION_DONE' | 'COMPLETED'>('LOADING');
  const [transcript, setTranscript] = useState('');
  const [redFlags, setRedFlags] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Guards to prevent duplicate processing / fetching
  const isFetchingRef = useRef(false);

  const { isRecording, volume, startRecording, stopRecording } = useAudioRecorder();
  const { playSpeech, stopSpeech, isPlaying } = useTTS();

  const fetchNextQuestion = useCallback(async (section: string, currentAnswers: any[]) => {
    console.log(`fetchNextQuestion called. isFetchingRef: ${isFetchingRef.current}, section: ${section}`);
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    console.log(`Setting isFetchingRef=true and fetching from API...`);
    setStatus('LOADING');
    setErrorMsg('');

    try {
      // Only send answers belonging to the current section to the backend to prevent cross-contamination
      const sectionAnswers = currentAnswers.filter(a => a.section_type === section);

      const ccAns = currentAnswers.find(a => a.question_id === 'cc_main');
      const chiefComplaint = ccAns ? ccAns.raw_answer : '';

      const res = await aiHistoryApi.getNextQuestion({
        session_id: session.id,
        section_type: section,
        language: session.lang,
        chief_complaint: chiefComplaint,
        answered_question_ids: sectionAnswers.map(a => a.question_id),
        collected_answers: sectionAnswers
      });

      if (res.section_complete) {
        setStatus('SECTION_DONE');
        
        // Ensure we process a section exactly once
        if (!globalProcessedSections.has(section)) {
          globalProcessedSections.add(section);
          try {
            const processRes = await aiHistoryApi.processSection({
              session_id: session.id,
              patient_id: session.patientId,
              language: session.lang,
              section_type: section,
              answers: sectionAnswers
            });
            
            if (processRes.red_flags && processRes.red_flags.length > 0) {
              setRedFlags(prev => {
                const existingTypes = new Set(prev.map(f => f.type));
                const newFlags = processRes.red_flags.filter((f: any) => !existingTypes.has(f.type));
                return [...prev, ...newFlags];
              });
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (res.next_section) {
          // Move to next section; effect will trigger new fetch
          setCurrentSection(res.next_section);
        } else {
          setStatus('COMPLETED');
        }
      } else {
        setQuestion(res.question);
        setStatus('READY');
        
        const textToSpeak = session.lang === 'hi' && res.question.hindi_text 
          ? res.question.hindi_text 
          : res.question.text;
        
        stopSpeech(); // Stop any existing TTS before starting new
        playSpeech(textToSpeak, session.lang).catch(console.error);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg("Connection to AI History backend failed. Is the server running?");
      setStatus('READY');
    } finally {
      isFetchingRef.current = false;
    }
  }, [session, playSpeech, stopSpeech]);

  useEffect(() => {
    // Only fetch if we are not already fetching. 
    // This resolves the StrictMode double mount issue without breaking the lifecycle.
    fetchNextQuestion(currentSection, answers);
    // We explicitly only want this to run when currentSection changes (or mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, fetchNextQuestion]);

  const handleStartRecording = async () => {
    if (isPlaying) stopSpeech();
    try {
      await startRecording(handleStopRecording);
      setStatus('RECORDING');
    } catch (e) {
      console.error("Mic error", e);
    }
  };

  const handleStopRecording = async () => {
    if (status !== 'RECORDING') return;
    setStatus('PROCESSING');
    try {
      const audioBase64 = await stopRecording();
      if (!audioBase64) {
        setStatus('READY');
        return;
      }
      
      const res = await aiHistoryApi.transcribeAudio(audioBase64, session.lang);
      setTranscript(res.transcript);
      setStatus('REVIEW');
    } catch (e) {
      console.error(e);
      setStatus('READY');
    }
  };

  const handleConfirmAnswer = (finalAnswer: string) => {
    console.log(`handleConfirmAnswer called with: ${finalAnswer}`);
    if (!question || isFetchingRef.current) {
      console.log(`handleConfirmAnswer: returning early (question null or fetching).`);
      return;
    }
    const newAnswer = {
      question_id: question.id,
      question_text: question.text,
      answer_type: 'VOICE',
      raw_answer: finalAnswer,
      section_type: currentSection
    };
    
    // Update state
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setTranscript('');
    setQuestion(null);
    
    // Explicitly pass updated answers to avoid closure staleness
    fetchNextQuestion(currentSection, newAnswers);
  };

  return (
    <main className="kiosk-screen">
      <div className="kiosk-container">
        
        {/* Progress & Status Header */}
        <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="step-indicator">
            <span className="text-muted">Section:</span> <strong className="text-primary-color">{currentSection}</strong>
          </div>
          <div className="text-muted">Status: {status}</div>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="card" style={{ borderColor: 'var(--color-emergency)', marginBottom: 'var(--space-6)' }}>
            <h3 style={{ color: 'var(--color-emergency)' }}>⚠️ System Error</h3>
            <p className="text-body mt-2">{errorMsg}</p>
            <button className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }} onClick={() => fetchNextQuestion(currentSection, answers)}>
              Retry
            </button>
          </div>
        )}

        {/* Red Flags Banner */}
        {redFlags.length > 0 && (
          <div className="card" style={{ borderColor: 'var(--color-emergency)', background: 'rgba(217, 48, 37, 0.15)', marginBottom: 'var(--space-6)' }}>
            <div className="badge badge-emergency" style={{ marginBottom: 'var(--space-4)' }}>Emergency Action Required</div>
            <ul style={{ paddingLeft: 'var(--space-4)' }}>
              {redFlags.map((rf, i) => (
                <li key={i} className="text-body">
                  <strong>{rf.type}</strong>: {rf.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Loading / Transition State */}
        {(status === 'LOADING' || status === 'SECTION_DONE') && !errorMsg && (
          <div className="card card-sm fade-in-up text-center py-12">
            <h2 className="text-heading text-muted">{status === 'LOADING' ? 'Loading next question...' : 'Processing section...'}</h2>
            <div className="progress-bar-container" style={{ marginTop: 'var(--space-6)', maxWidth: '300px', margin: 'var(--space-6) auto 0' }}>
              <div className="progress-bar-fill skeleton" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {/* Completed State */}
        {status === 'COMPLETED' && (
          <div className="card fade-in-up text-center py-12">
            <h2 className="text-display" style={{ color: 'var(--color-success)', marginBottom: 'var(--space-4)' }}>History Complete</h2>
            <p className="text-heading text-secondary" style={{ marginBottom: 'var(--space-8)' }}>
              Thank you. Your clinical history has been successfully recorded and sent to the doctor.
            </p>
            <button className="btn btn-primary btn-xl" onClick={() => router.push('/')}>
              Finish
            </button>
          </div>
        )}

        {/* Main Question Card */}
        {question && status !== 'SECTION_DONE' && status !== 'COMPLETED' && (
          <div className="card fade-in-up">
            <h2 className="text-display" style={{ marginBottom: 'var(--space-4)' }}>{question.text}</h2>
            {question.hindi_text && (
              <h3 className="text-heading text-secondary" style={{ marginBottom: 'var(--space-8)' }}>{question.hindi_text}</h3>
            )}

            {/* READY to answer */}
            {status === 'READY' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)' }}>
                
                {/* Voice Input */}
                <button 
                  className="btn btn-primary btn-xl"
                  onClick={handleStartRecording}
                >
                  <span style={{ fontSize: '1.5em' }}>🎤</span> Tap to Speak
                </button>
                
                {/* Touch Options */}
                {question.options && question.options.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
                    {question.options.map((opt: any) => (
                      <button 
                        key={opt.id}
                        className="btn btn-secondary"
                        onClick={() => handleConfirmAnswer(opt.value)}
                      >
                        {opt.label} {opt.hindi_label ? `(${opt.hindi_label})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RECORDING state */}
            {status === 'RECORDING' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)', padding: 'var(--space-6) 0' }}>
                <button 
                  className="mic-button recording"
                  onClick={handleStopRecording}
                >
                  <span style={{ fontSize: '2em' }}>🎙️</span>
                </button>
                
                <h3 className="text-heading" style={{ color: 'var(--color-emergency)' }}>Listening...</h3>
                
                <div className="progress-bar-container" style={{ maxWidth: '400px' }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, volume * 1.5)}%`, 
                      background: 'var(--color-emergency)',
                      transition: 'width 100ms linear'
                    }}
                  ></div>
                </div>
                
                <button className="btn btn-secondary" onClick={handleStopRecording}>
                  Stop Recording
                </button>
              </div>
            )}

            {/* PROCESSING state */}
            {status === 'PROCESSING' && (
              <div className="text-center py-12">
                <h3 className="text-heading text-muted">Transcribing audio...</h3>
                <div className="progress-bar-container" style={{ marginTop: 'var(--space-6)', maxWidth: '300px', margin: 'var(--space-6) auto 0' }}>
                  <div className="progress-bar-fill skeleton" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            {/* REVIEW transcript state */}
            {status === 'REVIEW' && (
              <div className="fade-in-up">
                <h4 className="text-subheading text-secondary" style={{ marginBottom: 'var(--space-2)' }}>You said:</h4>
                <div className="card-sm" style={{ background: 'rgba(255, 255, 255, 0.08)', marginBottom: 'var(--space-6)' }}>
                  <p className="text-heading">{transcript}</p>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => setStatus('READY')}
                  >
                    Try Again
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, background: 'var(--color-success)' }}
                    onClick={() => handleConfirmAnswer(transcript)}
                  >
                    Confirm & Continue
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
