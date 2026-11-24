import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { usePlayer } from '@/hooks/usePlayer';
import { nextIndex } from '@/lib/queue';
import { cn, formatDuration } from '@/lib/utils';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-darker';

const iconButton = cn(
  'p-2 rounded-lg text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-dark transition-colors',
  focusRing
);

/** Bottom bar for the queue player. Hidden until something is played. */
export function PlayerBar() {
  const player = usePlayer();
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(1);
  const { current, isPlaying, currentTime, duration, volume } = player;

  if (!current) return null;

  const index = player.queue.indexOf(current);
  const hasNext = nextIndex(index, player.queue.length) !== null;

  const toggleMute = () => {
    if (volume > 0) {
      setVolumeBeforeMute(volume);
      player.setVolume(0);
    } else {
      player.setVolume(volumeBeforeMute || 1);
    }
  };

  const timecode = `${formatDuration(currentTime)} / ${formatDuration(duration)}`;

  return (
    <>
      {/* Keeps page content clear of the fixed bar */}
      <div className="h-20" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-40 bg-studio-darker/95 backdrop-blur border-t border-studio-gray">
        <SeekBar
          key={`${current.trackId}:${current.versionId}`}
          currentTime={currentTime}
          duration={duration}
          onSeek={player.seek}
        />

        <div className="container mx-auto px-4 h-[4.75rem] flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={player.previous} aria-label="Previous" className={iconButton}>
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={player.toggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className={cn(
                'w-10 h-10 flex items-center justify-center bg-studio-accent text-white rounded-full hover:bg-studio-accent/90 transition-colors',
                focusRing
              )}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={player.next}
              disabled={!hasNext}
              aria-label="Next"
              className={cn(iconButton, 'disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed')}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <Link
              to={`/track/${current.shareableId}`}
              className={cn('block font-semibold truncate rounded hover:text-studio-accent transition-colors', focusRing)}
            >
              {current.title}
            </Link>
            <div className="flex items-center gap-2 text-sm text-studio-text-secondary">
              <span className="truncate">{current.creatorName}</span>
              <span className="sm:hidden shrink-0 text-xs mono tabular-nums">{timecode}</span>
            </div>
          </div>

          <span className="hidden sm:inline text-sm mono tabular-nums text-studio-text-secondary shrink-0">
            {timecode}
          </span>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button onClick={toggleMute} aria-label={volume === 0 ? 'Unmute' : 'Mute'} className={iconButton}>
              {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => player.setVolume(parseFloat(e.target.value))}
              aria-label="Volume"
              className={cn('w-24 h-2 bg-studio-dark rounded-lg appearance-none cursor-pointer accent-studio-accent', focusRing)}
            />
          </div>

          <button
            onClick={player.close}
            aria-label="Close player"
            title="Close player"
            className={cn(iconButton, 'shrink-0 -mr-2 sm:mr-0')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

/**
 * Thin progress line along the top edge of the player bar. The hit zone extends
 * upward from the top edge so it is easy to grab on touch screens without
 * overlapping transport controls; the thumb appears on hover, focus, or drag.
 */
function SeekBar({ currentTime, duration, onSeek }: SeekBarProps) {
  // Active drag state keyed to the initiating pointerId so secondary touches cannot interfere.
  const [scrub, setScrub] = useState<{ pointerId: number; time: number } | null>(null);
  const disabled = !duration;
  const shownTime = scrub?.time ?? Math.min(currentTime, duration || 0);
  const percent = duration ? (shownTime / duration) * 100 : 0;

  const timeAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    return ratio * duration;
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0 || scrub !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrub({ pointerId: e.pointerId, time: timeAt(e) });
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrub || e.pointerId !== scrub.pointerId) return;
    setScrub({ pointerId: scrub.pointerId, time: timeAt(e) });
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrub || e.pointerId !== scrub.pointerId) return;
    onSeek(timeAt(e));
    setScrub(null);
  };

  const handlePointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrub || e.pointerId !== scrub.pointerId) return;
    setScrub(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const steps: Record<string, number> = {
      ArrowLeft: currentTime - 5,
      ArrowDown: currentTime - 5,
      ArrowRight: currentTime + 5,
      ArrowUp: currentTime + 5,
      PageDown: currentTime - duration / 10,
      PageUp: currentTime + duration / 10,
      Home: 0,
      End: duration,
    };
    const target = steps[e.key];
    if (target === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    onSeek(Math.min(Math.max(target, 0), duration));
  };

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shownTime)}
      aria-valuetext={`${formatDuration(shownTime)} of ${formatDuration(duration)}`}
      aria-disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={() => setScrub(null)}
      onKeyDown={handleKeyDown}
      className={cn(
        // 32px tall hit zone extending above the top border, staying clear of transport buttons below.
        'group absolute inset-x-0 -top-6 h-8 flex items-end pb-1.5 touch-none select-none focus-visible:outline-none',
        disabled ? 'cursor-default' : 'cursor-pointer'
      )}
    >
      <div className="relative w-full h-1 bg-studio-gray group-hover:h-1.5 group-focus-visible:h-1.5 transition-[height] duration-150">
        <div className="absolute inset-y-0 left-0 bg-studio-accent" style={{ width: `${percent}%` }} />
        {!disabled && (
          <div
            className={cn(
              'absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow shadow-black/50',
              'opacity-0 scale-75 transition-[opacity,transform] duration-150',
              'group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100',
              'group-focus-visible:ring-2 group-focus-visible:ring-studio-accent',
              scrub !== null && 'opacity-100 scale-100'
            )}
            // Keep the thumb inside the viewport at both ends.
            style={{ left: `clamp(6px, ${percent}%, calc(100% - 6px))` }}
          />
        )}
      </div>
    </div>
  );
}
