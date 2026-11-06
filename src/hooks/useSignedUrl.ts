import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { CommentId, VersionId } from '@/types';

// R2 GET URLs expire after 1 hour; reuse them for 55 minutes.
const TTL_MS = 55 * 60 * 1000;
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Cached URL lookup outside a component's render (the queue player).
 * `fresh` skips the cache, for when a cached URL stopped working.
 */
export async function loadCachedUrl(
  cacheKey: string,
  fetchUrl: () => Promise<{ url: string }>,
  fresh = false
): Promise<string> {
  const cached = cache.get(cacheKey);
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.url;
  const { url } = await fetchUrl();
  cache.set(cacheKey, { url, expiresAt: Date.now() + TTL_MS });
  return url;
}

export const versionStreamKey = (versionId: VersionId) => `version:${versionId}`;

function useCachedUrl(cacheKey: string | undefined, fetchUrl: () => Promise<{ url: string }>) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!cacheKey);

  useEffect(() => {
    if (!cacheKey) return;
    let cancelled = false;

    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url);
      setLoading(false);
      return;
    }

    setUrl(null);
    setLoading(true);
    fetchUrl()
      .then(({ url }) => {
        cache.set(cacheKey, { url, expiresAt: Date.now() + TTL_MS });
        if (!cancelled) setUrl(url);
      })
      .catch((error) => {
        console.error('Failed to get file URL:', error);
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // fetchUrl is recreated every render; cacheKey fully identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { url, loading };
}

/** Signed streaming URL for a version's audio. */
export function useVersionStreamUrl(versionId: VersionId | undefined) {
  const getUrl = useAction(api.r2.getVersionStreamUrl);
  return useCachedUrl(versionId && versionStreamKey(versionId), () => getUrl({ versionId: versionId! }));
}

/** Signed URL for a comment's attachment. Pass undefined when there is none. */
export function useAttachmentUrl(commentId: CommentId | undefined) {
  const getUrl = useAction(api.r2.getAttachmentUrl);
  return useCachedUrl(commentId && `attachment:${commentId}`, () => getUrl({ commentId: commentId! }));
}
