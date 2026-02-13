import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { validateAttachmentFile } from '@/lib/utils';
import { nanoid } from 'nanoid';

/**
 * Hook for uploading comment attachments to R2 with progress tracking
 */
export function useAttachmentUpload() {
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

      const validation = validateAttachmentFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Use nanoid as path prefix since comment doesn't exist yet
      const commentId = nanoid();

      const { uploadUrl, r2Key } = await getUploadUrl({
        fileName: file.name,
        fileType: file.type,
        commentId,
      });

      // Upload to R2 using XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress((e.loaded / e.total) * 100);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setUploading(false);
      return { r2Key, fileName: file.name };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      throw err;
    }
  };

  const reset = () => {
    setUploading(false);
    setProgress(0);
    setError(null);
  };

  return { uploadAttachment, uploading, progress, error, reset };
}
