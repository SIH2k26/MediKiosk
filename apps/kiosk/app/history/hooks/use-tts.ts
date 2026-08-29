import { useState, useCallback, useRef } from 'react';
import { aiHistoryApi } from '@/lib/ai-history-shim';

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSpeech = useCallback(async (text: string, language: string = 'en') => {
    setIsPlaying(true);
    try {
      // 1. Try Sarvam TTS API
      const res = await aiHistoryApi.synthesizeSpeech(text, language);
      if (res.audio_base64) {
        const audioSrc = `data:audio/${res.format};base64,${res.audio_base64}`;
        const audio = new Audio(audioSrc);
        audioRef.current = audio;
        
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = (e) => reject(e);
          audio.play().catch(reject);
        });
        
        setIsPlaying(false);
        return;
      }
    } catch (error) {
      console.warn("TTS API failed, falling back to browser speech synthesis", error);
    }

    // 2. Fallback to browser Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      
      await new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    } else {
      console.error("No TTS fallback available");
    }
    
    setIsPlaying(false);
  }, []);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  return { playSpeech, stopSpeech, isPlaying };
}
