import { describe, expect, test } from 'vitest';
import { buildQueue, isQueueFrom, nextIndex, previousTarget } from './queue';
import type { TrackId, VersionId } from '@/types';

const track = (id: string, hasVersion = true) => ({
  _id: id as TrackId,
  latestVersionId: hasVersion ? (`v-${id}` as VersionId) : undefined,
  title: `Title ${id}`,
  creatorName: 'Someone',
  shareableId: `share-${id}`,
});

describe('queue', () => {
  test('starts at the picked track and keeps list order', () => {
    const tracks = [track('a'), track('b'), track('c'), track('d')];
    expect(buildQueue(tracks, 'b' as TrackId)?.map((i) => i.trackId)).toEqual(['b', 'c', 'd']);
  });

  test('plays each track at its latest version', () => {
    const [item] = buildQueue([track('a')], 'a' as TrackId)!;
    expect(item).toEqual({
      trackId: 'a',
      versionId: 'v-a',
      title: 'Title a',
      creatorName: 'Someone',
      shareableId: 'share-a',
    });
  });

  test('skips tracks with no version', () => {
    const tracks = [track('a'), track('b', false), track('c')];
    expect(buildQueue(tracks, 'a' as TrackId)?.map((i) => i.trackId)).toEqual(['a', 'c']);
  });

  test('no queue when the picked track has no version or is missing', () => {
    expect(buildQueue([track('a', false), track('b')], 'a' as TrackId)).toBeNull();
    expect(buildQueue([track('a')], 'z' as TrackId)).toBeNull();
  });

  test('next stops at the end instead of looping', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBeNull();
  });

  test('previous restarts after 3 seconds, otherwise goes back one', () => {
    expect(previousTarget(2, 3.5)).toBe('restart');
    expect(previousTarget(2, 3)).toBe(1);
    expect(previousTarget(2, 0)).toBe(1);
    expect(previousTarget(0, 0)).toBe('restart');
  });

  test('a queue belongs to a list when it is the rest of that list from some track', () => {
    const playlist = [track('a'), track('b', false), track('c'), track('d')];
    expect(isQueueFrom(buildQueue(playlist, 'a' as TrackId)!, playlist)).toBe(true);
    expect(isQueueFrom(buildQueue(playlist, 'c' as TrackId)!, playlist)).toBe(true);
  });

  test('a queue from another list does not belong, even if it shares a track', () => {
    const playlist = [track('a'), track('c')];
    const home = [track('a'), track('x')];
    expect(isQueueFrom(buildQueue(home, 'a' as TrackId)!, playlist)).toBe(false);
    expect(isQueueFrom([], playlist)).toBe(false);
  });

  test('a queue stops belonging once a track in it has a newer version', () => {
    const before = [track('a'), track('b')];
    const queue = buildQueue(before, 'a' as TrackId)!;
    const after = [track('a'), { ...track('b'), latestVersionId: 'v-b2' as VersionId }];
    expect(isQueueFrom(queue, after)).toBe(false);
  });

  test('a queue stops belonging once the list gains a track after it', () => {
    const before = [track('a'), track('b')];
    const queue = buildQueue(before, 'a' as TrackId)!;
    expect(isQueueFrom(queue, [...before, track('c')])).toBe(false);
  });
});
