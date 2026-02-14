import { useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAudioDuration } from './useAudioDuration';
import { validateAudioFile } from '@/lib/utils';
import {
  convertToMp3,
  isLosslessFormat,
  isConversionSupported,
} from '@/lib/audioConverter';
import type { Id } from '../../convex/_generated/dataModel';

export type UploadStage = 'idle' | 'converting' | 'uploading';

/**
 * Hook for uploading audio files to R2 with progress tracking
 * Converts lossless audio (WAV/FLAC) to MP3 320kbps for streaming
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [error, setError] = useState<string | null>(null);

  const getUploadUrls = useAction(api.r2.getTrackUploadUrls);
  const createVersion = useMutation(api.versions.create);
  const { getDuration } = useAudioDuration();

  const uploadFile = async (
    file: File,
    trackId: Id<'tracks'>,
    versionName: string,
    changeNotes?: string
  ) => {
    try {
      setUploading(true);
      setProgress(0);
      setStage('idle');
      setError(null);

      // Validate file
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const needsConversion = isLosslessFormat(file.name);
      let streamingFile = file;

      // Convert lossless to MP3 for streaming
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

      // Get audio duration from streaming file
      const duration = await getDuration(streamingFile);

      // Get presigned URLs for both files
      const urls = await getUploadUrls({
        fileName: file.name,
        fileType: file.type,
        trackId,
        versionName,
        needsConversion,
      });

      setStage('uploading');

      // Upload files in parallel
      const uploadPromises: Promise<void>[] = [];

      // Upload streaming file (always)
      uploadPromises.push(
        uploadToR2(urls.streamingUploadUrl, streamingFile, (p) => {
          if (needsConversion) {
            // Streaming upload is 30-65% of total (35% weight)
            setProgress(30 + Math.round((p * 35) / 100));
          } else {
            // No conversion: upload is 100% of progress
            setProgress(Math.round(p));
          }
        })
      );

      // Upload original file (only for lossless)
      if (needsConversion && urls.originalUploadUrl) {
        uploadPromises.push(
          uploadToR2(urls.originalUploadUrl, file, (p) => {
            // Original upload is 65-100% of total (35% weight)
            setProgress(65 + Math.round((p * 35) / 100));
          })
        );
      }

      await Promise.all(uploadPromises);

      // Save metadata to Convex
      const streamingExtension = needsConversion
        ? 'mp3'
        : file.name.split('.').pop()?.toLowerCase() || 'mp3';

      const versionId = await createVersion({
        trackId,
        versionName,
        changeNotes,
        r2Key: urls.streamingR2Key,
        fileName: streamingFile.name,
        fileSize: streamingFile.size,
        fileFormat: streamingExtension,
        duration,
        // Original file metadata (only for lossless)
        originalR2Key: urls.originalR2Key,
        originalFileName: needsConversion ? file.name : undefined,
        originalFileSize: needsConversion ? file.size : undefined,
        originalFileFormat: needsConversion
          ? file.name.split('.').pop()?.toLowerCase()
          : undefined,
      });

      setUploading(false);
      setStage('idle');
      return versionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setStage('idle');
      throw err;
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

/**
 * Upload a file to R2 using XMLHttpRequest with progress tracking
 */
async function uploadToR2(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress((e.loaded / e.total) * 100);
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

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}
