import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { validateUpload } from '@/lib/fileTypes';
import { putToSignedUrl } from '@/lib/r2Upload';
import type { TrackId } from '@/types';

/**
 * Hook for uploading comment attachments to R2 with progress tracking
 */
export function useAttachmentUpload(trackId: TrackId) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const getUploadUrl = useAction(api.r2.getAttachmentUploadUrl);

  const uploadAttachment = async (
    file: File
  ): Promise<{ r2Key: string; fileName: string }> => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const invalid = validateUpload(file, 'attachment');
      if (invalid) throw new Error(invalid);

      const { url, r2Key } = await getUploadUrl({ trackId, fileName: file.name });
      await putToSignedUrl(url, file, setProgress);

      return { r2Key, fileName: file.name };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploadAttachment, uploading, progress, error };
}
