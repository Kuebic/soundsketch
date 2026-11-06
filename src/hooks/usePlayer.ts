import { createContext, useContext } from 'react';
import type { QueueItem } from '@/lib/queue';
import type { Track, TrackId } from '@/types';

export interface Player {
  queue: QueueItem[];
  /** The queue item playing or paused, or null before anything was played. */
  current: QueueItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  /** Start a new queue at `trackId` in the list the listener pressed play on. */
  playFrom: (tracks: Track[], trackId: TrackId) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  /** Seek to a position in seconds. */
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

export const PlayerContext = createContext<Player | null>(null);

/** The app-wide queue player. Must be used under `PlayerProvider`. */
export function usePlayer(): Player {
  const player = useContext(PlayerContext);
  if (!player) throw new Error('usePlayer must be used inside PlayerProvider');
  return player;
}
