import { useRef } from 'react';
import { useWaveform } from '@/hooks/useWaveform';
import { usePresignedUrl } from '@/hooks/usePresignedUrl';
import { PlaybackControls } from './PlaybackControls';
import { Loader2 } from 'lucide-react';

interface TrackPlayerProps {
  r2Key: string;
  onTimestampClick?: (timestamp: number) => void;
}

export function TrackPlayer({ r2Key, onTimestampClick }: TrackPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { url, loading: urlLoading } = usePresignedUrl(r2Key);

  const {
    isPlaying,
    currentTime,
    duration,
    playPause,
    seekTo,
    setVolume,
    setPlaybackRate,
  } = useWaveform({
    audioUrl: url || '',
    containerRef,
    onReady: () => console.log('Waveform ready'),
    onTimeUpdate: (time) => {
      // Could trigger timestamp comment highlighting here
    },
  });

  if (urlLoading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-studio-accent" />
        <span className="ml-3 text-studio-text-secondary">Loading player...</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="card">
        <div className="text-center py-12 text-studio-text-secondary">
          Failed to load audio. Please try refreshing the page.
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      {/* Waveform */}
      <div
        ref={containerRef}
        className="waveform-container w-full cursor-pointer"
        onClick={(e) => {
          // Calculate timestamp from click position for future timestamp comments
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const progress = x / rect.width;
          const timestamp = progress * duration;
          onTimestampClick?.(timestamp);
        }}
      />

      {/* Playback Controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={playPause}
        onSeek={seekTo}
        onVolumeChange={setVolume}
        onPlaybackRateChange={setPlaybackRate}
      />
    </div>
  );
}
