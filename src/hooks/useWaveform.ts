import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface UseWaveformOptions {
  audioUrl: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onFinish?: () => void;
}

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

  // Store callbacks in refs to avoid re-initializing WaveSurfer when they change
  const onReadyRef = useRef(onReady);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onFinishRef = useRef(onFinish);
  onReadyRef.current = onReady;
  onTimeUpdateRef.current = onTimeUpdate;
  onFinishRef.current = onFinish;

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
      height: 80,
      barGap: 1,
      normalize: true,
    });

    wavesurfer.load(audioUrl);

    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
      onReadyRef.current?.();
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time);
      onTimeUpdateRef.current?.(time);
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      onFinishRef.current?.();
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl, containerRef]);

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
