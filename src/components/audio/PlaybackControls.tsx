import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { formatDuration } from '@/lib/utils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (progress: number) => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
}: PlaybackControlsProps) {
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    onVolumeChange(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      onVolumeChange(volume);
      setIsMuted(false);
    } else {
      onVolumeChange(0);
      setIsMuted(true);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    onPlaybackRateChange(rate);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => onSeek(parseFloat(e.target.value) / 100)}
          className="w-full h-2 bg-studio-dark rounded-lg appearance-none cursor-pointer accent-studio-accent"
        />
        <div className="flex justify-between text-sm mono text-studio-text-secondary">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-0">
        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className="p-3 bg-studio-accent rounded-full hover:bg-studio-accent/90 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>

        {/* Volume + Speed: grouped row on mobile, direct children on desktop */}
        <div className="flex items-center justify-between w-full sm:w-auto sm:contents">
          {/* Volume */}
          <div className="flex items-center space-x-2">
            <button onClick={toggleMute} className="p-2 hover:bg-studio-dark rounded-lg transition-colors">
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-24 h-2 bg-studio-dark rounded-lg appearance-none cursor-pointer accent-studio-accent"
            />
          </div>

          {/* Playback Speed */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-studio-text-secondary mono hidden sm:inline">Speed:</span>
            <select
              value={playbackRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="bg-studio-dark border border-studio-gray rounded-lg px-3 py-1 text-sm mono cursor-pointer"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
