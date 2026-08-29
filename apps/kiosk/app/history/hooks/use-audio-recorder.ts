import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [volume, setVolume] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const silenceStartRef = useRef<number>(0);

  const startRecording = useCallback(async (onSilenceDetected?: () => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Audio analysis for volume/waveform and silence detection
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        setVolume(avg);

        // Silence detection
        if (avg < 5) {
          if (silenceStartRef.current === 0) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > 2500) { // 2.5s of silence
            if (onSilenceDetected && isRecordingRef.current) {
              onSilenceDetected();
              return; // Stop animation loop if silence triggered action
            }
          }
        } else {
          silenceStartRef.current = 0;
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      isRecordingRef.current = true;
      checkVolume();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve('');
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          resolve(base64data);
        };
        
        // Cleanup
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setIsRecording(false);
        isRecordingRef.current = false;
        setVolume(0);
        silenceStartRef.current = 0;
        
        // Stop all tracks to release mic
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };

      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        resolve('');
      }
    });
  }, []);

  return {
    isRecording,
    volume,
    startRecording,
    stopRecording
  };
}
