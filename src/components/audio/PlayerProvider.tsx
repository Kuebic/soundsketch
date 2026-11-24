import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAction } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { PlayerContext, type Player } from '@/hooks/usePlayer';
import { loadCachedUrl, versionStreamKey } from '@/hooks/useSignedUrl';
import { claimAudioFocus, releaseAudioFocus } from '@/lib/audioFocus';
import { buildQueue, nextIndex, previousTarget, type QueueItem } from '@/lib/queue';
import type { VersionId } from '@/types';

interface QueueState {
  queue: QueueItem[];
  index: number;
  /** Bumped whenever a queue item should (re)start loading. */
  playId: number;
}

/**
 * Owns the one audio element the queue plays through. Mounted above the
 * routes so playback continues across pages.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const getStreamUrl = useAction(api.r2.getVersionStreamUrl);
  const getStreamUrlRef = useRef(getStreamUrl);
  getStreamUrlRef.current = getStreamUrl;

  const [audio] = useState(() => new Audio());
  const [{ queue, index, playId }, setQueueState] = useState<QueueState>({ queue: [], index: 0, playId: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);

  const current: QueueItem | null = queue[index] ?? null;
  const currentRef = useRef<QueueItem | null>(current);
  currentRef.current = current;
  // Shared synchronous token invalidated on every item switch, unmount, or close().
  const loadTokenRef = useRef(0);
  const pendingMetadataListenerRef = useRef<(() => void) | null>(null);
  // One fresh-URL retry per item, for stream URLs that expired mid-listen.
  const retriedRef = useRef(false);

  const invalidatePendingLoad = useCallback(() => {
    loadTokenRef.current += 1;
    if (pendingMetadataListenerRef.current) {
      audio.removeEventListener('loadedmetadata', pendingMetadataListenerRef.current);
      pendingMetadataListenerRef.current = null;
    }
  }, [audio]);

  const loadUrl = useCallback(
    (versionId: VersionId, fresh = false) =>
      loadCachedUrl(versionStreamKey(versionId), () => getStreamUrlRef.current({ versionId }), fresh),
    []
  );

  const advance = useCallback(() => {
    setQueueState((s) => {
      const i = nextIndex(s.index, s.queue.length);
      return i === null ? s : { ...s, index: i, playId: s.playId + 1 };
    });
  }, []);

  const skip = useCallback(
    (item: QueueItem) => {
      toast.error(`Couldn't play "${item.title}"`);
      advance();
    },
    [advance]
  );

  // Load and start the current item whenever one is (re)started.
  useEffect(() => {
    const item = currentRef.current;
    if (!item) return;
    invalidatePendingLoad();
    const token = loadTokenRef.current;
    retriedRef.current = false;
    audio.pause();
    setCurrentTime(0);
    setDuration(0);

    loadUrl(item.versionId).then(
      (url) => {
        if (loadTokenRef.current !== token) return;
        audio.src = url;
        // Media failures arrive as 'error' events; a blocked autoplay just stays paused.
        audio.play().catch(() => {});
      },
      () => {
        if (loadTokenRef.current === token) skip(item);
      }
    );

    return () => {
      invalidatePendingLoad();
    };
  }, [playId, audio, invalidatePendingLoad, loadUrl, skip]);

  useEffect(() => {
    const pauseAudio = () => audio.pause();

    const onPlay = () => {
      claimAudioFocus(pauseAudio);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onPlaying = () => {
      retriedRef.current = false;
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    const onError = () => {
      const item = currentRef.current;
      if (!item) return;
      // A broken file won't fix itself; an expired URL will with a fresh one.
      if (retriedRef.current || audio.error?.code === MediaError.MEDIA_ERR_DECODE) {
        skip(item);
        return;
      }
      retriedRef.current = true;
      const token = loadTokenRef.current;
      const resumeAt = audio.currentTime;
      loadUrl(item.versionId, true).then(
        (url) => {
          if (loadTokenRef.current !== token) return;
          if (pendingMetadataListenerRef.current) {
            audio.removeEventListener('loadedmetadata', pendingMetadataListenerRef.current);
          }
          const onLoadedMetadata = () => {
            pendingMetadataListenerRef.current = null;
            if (loadTokenRef.current === token) {
              audio.currentTime = resumeAt;
            }
          };
          pendingMetadataListenerRef.current = onLoadedMetadata;
          audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          audio.src = url;
          audio.play().catch(() => {});
        },
        () => {
          if (loadTokenRef.current === token) skip(item);
        }
      );
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('ended', advance);
    audio.addEventListener('error', onError);

    return () => {
      invalidatePendingLoad();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended', advance);
      audio.removeEventListener('error', onError);
      audio.pause();
      releaseAudioFocus(pauseAudio);
    };
  }, [audio, advance, invalidatePendingLoad, loadUrl, skip]);

  const playFrom = useCallback<Player['playFrom']>((tracks, trackId) => {
    const items = buildQueue(tracks, trackId);
    if (!items) return;
    setQueueState((s) => ({ queue: items, index: 0, playId: s.playId + 1 }));
  }, []);

  const toggle = useCallback(() => {
    if (!currentRef.current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [audio]);

  const previous = useCallback(() => {
    const target = previousTarget(index, audio.currentTime);
    if (target === 'restart') {
      audio.currentTime = 0;
      setCurrentTime(0);
    } else {
      setQueueState((s) => ({ ...s, index: target, playId: s.playId + 1 }));
    }
  }, [audio, index]);

  const seek = useCallback(
    (seconds: number) => {
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    },
    [audio]
  );

  const setVolume = useCallback(
    (v: number) => {
      audio.volume = v;
      setVolumeState(v);
    },
    [audio]
  );

  const close = useCallback(() => {
    // Synchronously invalidate any in-flight URL loads or retry metadata listeners
    // before resetting the audio element and queue.
    invalidatePendingLoad();
    currentRef.current = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    setQueueState((s) => ({ queue: [], index: 0, playId: s.playId + 1 }));
  }, [audio, invalidatePendingLoad]);

  const player = useMemo<Player>(
    () => ({
      queue,
      current,
      isPlaying,
      currentTime,
      duration,
      volume,
      playFrom,
      toggle,
      next: advance,
      previous,
      seek,
      setVolume,
      close,
    }),
    [queue, current, isPlaying, currentTime, duration, volume, playFrom, toggle, advance, previous, seek, setVolume, close]
  );

  return <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>;
}
