import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface CachedUrl {
  url: string;
  expiresAt: number;
}

// In-memory cache for presigned URLs
const urlCache = new Map<string, CachedUrl>();

/**
 * Hook to manage presigned URL caching and regeneration
 * Caches URLs for 55 minutes (before 1-hour expiry)
 */
export function usePresignedUrl(r2Key: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const getDownloadUrl = useAction(api.r2.getTrackDownloadUrl);

  useEffect(() => {
    if (!r2Key) return;

    const fetchUrl = async () => {
      // Check cache
      const cached = urlCache.get(r2Key);
      const now = Date.now();

      if (cached && cached.expiresAt > now) {
        setUrl(cached.url);
        return;
      }

      // Fetch new URL
      setLoading(true);
      try {
        const { downloadUrl } = await getDownloadUrl({ r2Key });

        // Cache with expiry (55 minutes, before 1 hour actual expiry)
        const expiresAt = now + 55 * 60 * 1000;
        urlCache.set(r2Key, { url: downloadUrl, expiresAt });

        setUrl(downloadUrl);
      } catch (error) {
        console.error('Failed to get download URL:', error);
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [r2Key, getDownloadUrl]);

  return { url, loading };
}
