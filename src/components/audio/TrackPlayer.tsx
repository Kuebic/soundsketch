import { useRef, useEffect, useCallback } from 'react';
import { useWaveform } from '@/hooks/useWaveform';
import { useVersionStreamUrl } from '@/hooks/useSignedUrl';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { PlaybackControls } from './PlaybackControls';
import { TimestampMarker } from '@/components/comments/TimestampMarker';
import { formatDuration } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { VersionId } from '@/types';

const SKIP_SECONDS = 5;

interface TimestampComment {
  id: string;
  timestamp: number;
  authorName: string;
  commentPreview: string;
}

interface TrackPlayerProps {
  versionId: VersionId;
  /** Asks the page to open a timestamp comment form at this time (seconds). */
  onRequestComment?: (timestamp: number) => void;
  timestampComments?: TimestampComment[];
  seekToTime?: number | null;
  onSeekComplete?: () => void;
}

export function TrackPlayer({
  versionId,
  onRequestComment,
  timestampComments,
  seekToTime,
  onSeekComplete,
}: TrackPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { url, loading: urlLoading } = useVersionStreamUrl(versionId);

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
  });

  const seekBy = useCallback(
    (delta: number) => {
      if (duration > 0) {
        const newTime = Math.min(Math.max(currentTime + delta, 0), duration);
        seekTo(newTime / duration);
      }
    },
    [currentTime, duration, seekTo]
  );
  const seekForward = useCallback(() => seekBy(SKIP_SECONDS), [seekBy]);
  const seekBackward = useCallback(() => seekBy(-SKIP_SECONDS), [seekBy]);

  useKeyboardShortcuts({
    onPlayPause: playPause,
    onSeekForward: seekForward,
    onSeekBackward: seekBackward,
  });

  // Handle external seek requests
  useEffect(() => {
    if (seekToTime != null && duration > 0) {
      seekTo(seekToTime / duration);
      if (!isPlaying) playPause();
      onSeekComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const commentAtLabel = `Comment at ${formatDuration(currentTime)}`;

  return (
    <div className="card space-y-3 sm:space-y-4">
      <div>
        {/* Waveform with timestamp markers. Single click seeks (WaveSurfer native);
            double-click opens a timestamp comment at that position. */}
        <div className="relative">
          <div
            ref={containerRef}
            className="waveform-container w-full cursor-pointer"
            onDoubleClick={(e) => {
              if (!onRequestComment || duration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const progress = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
              onRequestComment(progress * duration);
            }}
          />

          {timestampComments && duration > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {timestampComments.map((tc) => (
                <TimestampMarker
                  key={tc.id}
                  timestamp={tc.timestamp}
                  duration={duration}
                  authorName={tc.authorName}
                  commentPreview={tc.commentPreview}
                  onClick={() => {
                    seekTo(tc.timestamp / duration);
                    if (!isPlaying) playPause();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Time at the waveform edges, with a micro-hint between them */}
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs mono tabular-nums text-studio-text-secondary">
          <span className="text-studio-text-primary">{formatDuration(currentTime)}</span>
          {onRequestComment && (
            <span className="hidden sm:block truncate font-body text-[11px] text-studio-text-secondary/70">
              Double-click waveform to seek and comment, or press &ldquo;{commentAtLabel}&rdquo;
            </span>
          )}
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        onPlayPause={playPause}
        onSkipBack={seekBackward}
        onSkipForward={seekForward}
        onVolumeChange={setVolume}
        onPlaybackRateChange={setPlaybackRate}
        onCommentAtCurrentTime={onRequestComment ? () => onRequestComment(currentTime) : undefined}
      />
    </div>
  );
}
