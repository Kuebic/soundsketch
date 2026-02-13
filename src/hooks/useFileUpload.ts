import { useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAudioDuration } from './useAudioDuration';
import { validateAudioFile } from '@/lib/utils';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * Hook for uploading audio files to R2 with progress tracking
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const getUploadUrl = useAction(api.r2.getTrackUploadUrl);
  const createVersion = useMutation(api.versions.create);
  const { getDuration } = useAudioDuration();

  const uploadFile = async (
    file: File,
    trackId: Id<"tracks">,
    versionName: string,
    changeNotes?: string
  ) => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Validate file
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get audio duration
      const duration = await getDuration(file);

      // Get presigned upload URL
      const { uploadUrl, r2Key } = await getUploadUrl({
        fileName: file.name,
        fileType: file.type,
        trackId,
        versionName,
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

      // Save metadata to Convex
      const extension = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const versionId = await createVersion({
        trackId,
        versionName,
        changeNotes,
        r2Key,
        fileName: file.name,
        fileSize: file.size,
        fileFormat: extension,
        duration,
      });

      setUploading(false);
      return versionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      throw err;
    }
  };

  return {
    uploadFile,
    uploading,
    progress,
    error,
  };
}
