import { useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAudioDuration } from './useAudioDuration';
import { extensionOf, isLossless, validateUpload } from '@/lib/fileTypes';
import { convertToMp3, isConversionSupported } from '@/lib/audioConverter';
import { putToSignedUrl } from '@/lib/r2Upload';
import type { TrackId } from '@/types';

export type UploadStage = 'idle' | 'converting' | 'uploading';

/**
 * Hook for uploading a new track version to R2 with progress tracking.
 * Lossless audio (WAV/FLAC) is converted to MP3 320kbps for streaming and
 * the original is uploaded alongside it for download.
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [error, setError] = useState<string | null>(null);

  const getUploadUrls = useAction(api.r2.getVersionUploadUrls);
  const createVersion = useMutation(api.versions.create);
  const { getDuration } = useAudioDuration();

  const uploadFile = async (
    file: File,
    trackId: TrackId,
    versionName: string,
    changeNotes?: string
  ) => {
    try {
      setUploading(true);
      setProgress(0);
      setStage('idle');
      setError(null);

      const invalid = validateUpload(file, 'track');
      if (invalid) throw new Error(invalid);

      const needsConversion = isLossless(file.name);
      let streamingFile = file;

      if (needsConversion) {
        if (!isConversionSupported()) {
          throw new Error(
            'Audio conversion requires a modern browser with cross-origin isolation. Please use Chrome or Firefox, or upload an MP3 file.'
          );
        }

        setStage('converting');
        streamingFile = await convertToMp3(file, (convProgress) => {
          // Conversion is 30% of total progress
          setProgress(Math.round(convProgress.progress * 0.3));
        });
      }

      const duration = await getDuration(streamingFile);
      const urls = await getUploadUrls({ trackId, fileName: file.name, needsConversion });

      // Progress split: no conversion → upload is 0-100%;
      // conversion → streaming 30-65%, original 65-100%.
      setStage('uploading');
      await Promise.all([
        putToSignedUrl(urls.streaming.url, streamingFile, (p) =>
          setProgress(needsConversion ? 30 + Math.round(p * 0.35) : Math.round(p))
        ),
        urls.original &&
          putToSignedUrl(urls.original.url, file, (p) => setProgress(65 + Math.round(p * 0.35))),
      ]);

      return await createVersion({
        trackId,
        versionName,
        changeNotes,
        r2Key: urls.streaming.r2Key,
        fileName: streamingFile.name,
        fileSize: streamingFile.size,
        fileFormat: extensionOf(streamingFile.name) || 'mp3',
        duration,
        ...(urls.original && {
          originalR2Key: urls.original.r2Key,
          originalFileName: file.name,
          originalFileSize: file.size,
          originalFileFormat: extensionOf(file.name),
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
      setStage('idle');
    }
  };

  return {
    uploadFile,
    uploading,
    progress,
    stage,
    error,
  };
}
