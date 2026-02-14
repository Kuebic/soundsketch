import { useState, useRef, useCallback, useEffect } from 'react';
import { getRecordingMimeType, mimeToExtension } from '@/lib/utils';

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

interface UseAudioRecordingOptions {
  maxDuration?: number; // seconds, default 300 (5 min)
  onMaxDurationReached?: () => void;
}

interface UseAudioRecordingReturn {
  state: RecordingState;
  error: string | null;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
  getFile: () => File | null;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}): UseAudioRecordingReturn {
  const { maxDuration = 300, onMaxDurationReached } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      setState('requesting');
      setError(null);
      setDuration(0);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mimeTypeRef.current = getRecordingMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState('stopped');

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording failed. Please try again.');
        setState('error');
        cleanup();
      };

      mediaRecorder.start(1000); // Collect data every second
      setState('recording');

      // Start duration timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          onMaxDurationReached?.();
          mediaRecorderRef.current?.stop();
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 100);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start recording');
      }
      setState('error');
      cleanup();
    }
  }, [audioUrl, cleanup, maxDuration, onMaxDurationReached]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setError(null);
    setDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
  }, [cleanup]);

  const getFile = useCallback((): File | null => {
    if (!audioBlob) return null;

    const extension = mimeToExtension(mimeTypeRef.current);
    const timestamp = Date.now();
    const fileName = `voice-recording-${timestamp}.${extension}`;

    return new File([audioBlob], fileName, { type: mimeTypeRef.current });
  }, [audioBlob]);

  return {
    state,
    error,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    reset,
    getFile,
  };
}
