import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface UseWaveformOptions {
  audioUrl: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onFinish?: () => void;
}

/**
 * Hook to manage Wavesurfer.js lifecycle with proper cleanup
 * CRITICAL: Always destroys instance in cleanup to prevent memory leaks
 */
export function useWaveform({
  audioUrl,
  containerRef,
  onReady,
  onTimeUpdate,
  onFinish,
}: UseWaveformOptions) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize Wavesurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4a5568',
      progressColor: '#8b5cf6',
      cursorColor: '#8b5cf6',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 2,
      height: 128,
      barGap: 1,
      responsive: true,
      normalize: true,
    });

    wavesurfer.load(audioUrl);

    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
      onReady?.();
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time);
      onTimeUpdate?.(time);
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      onFinish?.();
    });

    wavesurferRef.current = wavesurfer;

    // CRITICAL: Cleanup to prevent memory leaks
    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl, containerRef, onReady, onTimeUpdate, onFinish]);

  const playPause = () => {
    wavesurferRef.current?.playPause();
  };

  const seekTo = (progress: number) => {
    wavesurferRef.current?.seekTo(progress);
  };

  const setVolume = (volume: number) => {
    wavesurferRef.current?.setVolume(volume);
  };

  const setPlaybackRate = (rate: number) => {
    wavesurferRef.current?.setPlaybackRate(rate);
  };

  const stop = () => {
    wavesurferRef.current?.stop();
    setIsPlaying(false);
  };

  return {
    wavesurfer: wavesurferRef.current,
    isPlaying,
    currentTime,
    duration,
    playPause,
    seekTo,
    setVolume,
    setPlaybackRate,
    stop,
  };
}
