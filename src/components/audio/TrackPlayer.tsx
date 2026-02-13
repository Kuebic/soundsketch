import { useRef, useEffect } from 'react';
import { useWaveform } from '@/hooks/useWaveform';
import { usePresignedUrl } from '@/hooks/usePresignedUrl';
import { PlaybackControls } from './PlaybackControls';
import { TimestampMarker } from '@/components/comments/TimestampMarker';
import { Loader2 } from 'lucide-react';

interface TimestampComment {
  id: string;
  timestamp: number;
  authorName: string;
  commentPreview: string;
}

interface TrackPlayerProps {
  r2Key: string;
  onTimestampClick?: (timestamp: number) => void;
  timestampComments?: TimestampComment[];
  seekToTime?: number | null;
  onSeekComplete?: () => void;
}

export function TrackPlayer({
  r2Key,
  onTimestampClick,
  timestampComments,
  seekToTime,
  onSeekComplete,
}: TrackPlayerProps) {
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
    onTimeUpdate: () => {},
  });

  // Handle external seek requests
  useEffect(() => {
    if (seekToTime != null && duration > 0) {
      seekTo(seekToTime / duration);
      if (!isPlaying) playPause();
      onSeekComplete?.();
    }
  }, [seekToTime]);

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
      {/* Waveform with timestamp markers */}
      <div className="relative">
        <div
          ref={containerRef}
          className="waveform-container w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const progress = x / rect.width;
            const timestamp = progress * duration;
            onTimestampClick?.(timestamp);
          }}
        />

        {/* Timestamp comment markers overlay */}
        {timestampComments && duration > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {timestampComments.map((tc) => (
              <div key={tc.id} className="pointer-events-auto">
                <TimestampMarker
                  timestamp={tc.timestamp}
                  duration={duration}
                  authorName={tc.authorName}
                  commentPreview={tc.commentPreview}
                  onClick={() => {
                    seekTo(tc.timestamp / duration);
                    if (!isPlaying) playPause();
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

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
