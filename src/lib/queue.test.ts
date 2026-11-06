import { describe, expect, test } from 'vitest';
import { buildQueue, nextIndex, previousTarget } from './queue';
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
});
