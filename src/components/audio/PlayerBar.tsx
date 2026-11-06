import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '@/hooks/usePlayer';
import { nextIndex } from '@/lib/queue';
import { formatDuration } from '@/lib/utils';

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

  return (
    <>
      {/* Keeps page content clear of the fixed bar */}
      <div className="h-20" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-40 bg-studio-darker/95 backdrop-blur border-t border-studio-gray">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => player.seek(parseFloat(e.target.value))}
          disabled={!duration}
          aria-label="Seek"
          className="block w-full h-1 appearance-none cursor-pointer bg-studio-gray accent-studio-accent"
        />

        <div className="container mx-auto px-4 h-[4.75rem] flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={player.previous}
              aria-label="Previous"
              className="p-2 rounded-lg hover:bg-studio-dark transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={player.toggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="p-2.5 bg-studio-accent rounded-full hover:bg-studio-accent/90 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={player.next}
              disabled={!hasNext}
              aria-label="Next"
              className="p-2 rounded-lg hover:bg-studio-dark transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <Link
              to={`/track/${current.shareableId}`}
              className="block font-semibold truncate hover:text-studio-accent transition-colors"
            >
              {current.title}
            </Link>
            <p className="text-sm text-studio-text-secondary truncate">{current.creatorName}</p>
          </div>

          <span className="hidden sm:inline text-sm mono text-studio-text-secondary shrink-0">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={toggleMute}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              className="p-2 rounded-lg hover:bg-studio-dark transition-colors"
            >
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
              className="w-24 h-2 bg-studio-dark rounded-lg appearance-none cursor-pointer accent-studio-accent"
            />
          </div>
        </div>
      </div>
    </>
  );
}
