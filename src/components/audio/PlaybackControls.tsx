import { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw, MessageSquarePlus } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  /** Opens the timestamp comment form at the current playhead. Hidden when omitted. */
  onCommentAtCurrentTime?: () => void;
}

const iconButtonBase =
  'p-2 rounded-lg hover:text-studio-text-primary hover:bg-studio-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent';
const iconButton = `${iconButtonBase} text-studio-text-secondary`;

export function PlaybackControls({
  isPlaying,
  currentTime,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onVolumeChange,
  onPlaybackRateChange,
  onCommentAtCurrentTime,
}: PlaybackControlsProps) {
  const [volume, setVolume] = useState(1);
  const lastPositiveVolumeRef = useRef(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    onVolumeChange(newVolume);
    if (newVolume > 0) {
      lastPositiveVolumeRef.current = newVolume;
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      const restored = volume > 0 ? volume : lastPositiveVolumeRef.current;
      setVolume(restored);
      onVolumeChange(restored);
      setIsMuted(false);
    } else {
      onVolumeChange(0);
      setIsMuted(true);
    }
  };

  const cycleRate = () => {
    const index = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(next);
    onPlaybackRateChange(next);
  };

  const silent = isMuted || volume === 0;
  const timeLabel = formatDuration(currentTime);

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4">
      {/* Transport */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onSkipBack}
          className={iconButton}
          aria-label="Skip back 5 seconds"
          title="Back 5s (Left arrow)"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onPlayPause}
          className="p-3 bg-studio-accent text-white rounded-full hover:bg-studio-accent/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-darker"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
        </button>
        <button
          type="button"
          onClick={onSkipForward}
          className={iconButton}
          aria-label="Skip forward 5 seconds"
          title="Forward 5s (Right arrow)"
        >
          <RotateCw className="w-5 h-5" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {onCommentAtCurrentTime && (
          <button
            type="button"
            onClick={onCommentAtCurrentTime}
            className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 rounded-lg border border-studio-accent-cyan/30 bg-studio-accent-cyan/10 text-sm text-studio-accent-cyan hover:bg-studio-accent-cyan/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent-cyan"
            aria-label={`Add comment at ${timeLabel}`}
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span className="sm:hidden">Comment</span>
            <span className="hidden sm:inline">
              Comment at <span className="mono tabular-nums">{timeLabel}</span>
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={cycleRate}
          className={cn(
            iconButtonBase,
            'min-w-[3.25rem] px-2 text-sm mono tabular-nums',
            playbackRate !== 1 ? 'text-studio-accent' : 'text-studio-text-secondary'
          )}
          aria-label={`Playback speed ${playbackRate}x. Click to change.`}
          title="Playback speed"
        >
          {playbackRate}x
        </button>

        {/* Volume: hidden on mobile, where hardware buttons control volume */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={toggleMute}
            className={iconButton}
            aria-label={silent ? 'Unmute' : 'Mute'}
          >
            {silent ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 lg:w-24 h-1 bg-studio-gray rounded-full appearance-none cursor-pointer accent-studio-accent"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
