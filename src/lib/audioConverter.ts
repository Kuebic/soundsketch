import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export type ConversionProgress = {
  stage: 'loading' | 'converting' | 'complete';
  progress: number; // 0-100
};

/**
 * Check if SharedArrayBuffer is available (required for ffmpeg.wasm)
 */
export function isConversionSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Initialize ffmpeg.wasm (loads ~30MB WASM, cached after first use)
 */
export async function initFFmpeg(
  onProgress?: (progress: ConversionProgress) => void
): Promise<void> {
  if (ffmpeg?.loaded) return;

  if (!isConversionSupported()) {
    throw new Error(
      'Audio conversion is not supported in this browser. Please use Chrome or Firefox with cross-origin isolation enabled.'
    );
  }

  ffmpeg = new FFmpeg();

  onProgress?.({ stage: 'loading', progress: 0 });

  // Load ffmpeg core from CDN (cached by browser after first load)
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  onProgress?.({ stage: 'loading', progress: 100 });
}

/**
 * Convert a lossless audio file (WAV/FLAC) to MP3 320kbps
 */
export async function convertToMp3(
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<File> {
  if (!ffmpeg?.loaded) {
    await initFFmpeg(onProgress);
  }

  const inputExtension = file.name.split('.').pop()?.toLowerCase() || 'wav';
  const inputName = `input.${inputExtension}`;
  const outputName = 'output.mp3';

  // Write input file to ffmpeg virtual filesystem
  await ffmpeg!.writeFile(inputName, await fetchFile(file));

  // Set up progress tracking
  ffmpeg!.on('progress', ({ progress }) => {
    onProgress?.({ stage: 'converting', progress: Math.round(progress * 100) });
  });

  // Convert to MP3 320kbps
  await ffmpeg!.exec([
    '-i',
    inputName,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '320k',
    '-y',
    outputName,
  ]);

  // Read output file
  const data = await ffmpeg!.readFile(outputName);

  // Clean up virtual filesystem
  await ffmpeg!.deleteFile(inputName);
  await ffmpeg!.deleteFile(outputName);

  onProgress?.({ stage: 'complete', progress: 100 });

  // Create new File object with MP3 extension
  // Copy data to a new ArrayBuffer to avoid SharedArrayBuffer issues
  const uint8Data = data as Uint8Array;
  const buffer = new ArrayBuffer(uint8Data.byteLength);
  const view = new Uint8Array(buffer);
  view.set(uint8Data);

  const mp3FileName = file.name.replace(/\.(wav|flac)$/i, '.mp3');
  return new File([view], mp3FileName, { type: 'audio/mpeg' });
}

/**
 * Check if a file is a lossless format that should be converted
 */
export function isLosslessFormat(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext === 'wav' || ext === 'flac';
}
