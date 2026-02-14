import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface CachedUrl {
  url: string;
  expiresAt: number;
}

// In-memory cache for attachment presigned URLs
const attachmentUrlCache = new Map<string, CachedUrl>();

/**
 * Hook to eagerly fetch and cache presigned download URLs for comment attachments.
 * Caches URLs for 55 minutes (before the 1-hour R2 expiry).
 */
export function useAttachmentUrl(r2Key: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const getDownloadUrl = useAction(api.r2.getAttachmentDownloadUrl);

  useEffect(() => {
    if (!r2Key) return;

    const fetchUrl = async () => {
      // Check cache
      const cached = attachmentUrlCache.get(r2Key);
      const now = Date.now();

      if (cached && cached.expiresAt > now) {
        setUrl(cached.url);
        return;
      }

      setLoading(true);
      try {
        const { downloadUrl } = await getDownloadUrl({ r2Key });

        // Cache with 55-minute TTL
        const expiresAt = now + 55 * 60 * 1000;
        attachmentUrlCache.set(r2Key, { url: downloadUrl, expiresAt });

        setUrl(downloadUrl);
      } catch (error) {
        console.error('Failed to get attachment URL:', error);
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [r2Key, getDownloadUrl]);

  return { url, loading };
}
