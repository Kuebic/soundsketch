import type { Track, TrackId, VersionId } from '@/types';

/** One track in the queue, playing its latest version. */
export interface QueueItem {
  trackId: TrackId;
  versionId: VersionId;
  title: string;
  creatorName: string;
  shareableId: string;
}

type QueueSource = Pick<Track, '_id' | 'latestVersionId' | 'title' | 'creatorName' | 'shareableId'>;

/** Previous restarts the current track once this many seconds have played. */
export const RESTART_THRESHOLD_SECONDS = 3;

/**
 * The queue for pressing play on `startTrackId` in `tracks`: that track and
 * the ones after it, skipping tracks with no version. Null if the start track
 * has no version or is not in the list.
 */
export function buildQueue(tracks: QueueSource[], startTrackId: TrackId): QueueItem[] | null {
  const start = tracks.findIndex((t) => t._id === startTrackId);
  if (start === -1 || !tracks[start].latestVersionId) return null;

  return tracks.slice(start).flatMap((t) =>
    t.latestVersionId
      ? [{
          trackId: t._id,
          versionId: t.latestVersionId,
          title: t.title,
          creatorName: t.creatorName,
          shareableId: t.shareableId,
        }]
      : []
  );
}

/** Index after `index`, or null when the queue has ended. */
export function nextIndex(index: number, length: number): number | null {
  return index + 1 < length ? index + 1 : null;
}

/** What previous does: restart the current track, or go back one. */
export function previousTarget(index: number, currentTime: number): 'restart' | number {
  return currentTime > RESTART_THRESHOLD_SECONDS || index === 0 ? 'restart' : index - 1;
}
