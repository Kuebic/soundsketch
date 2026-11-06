import { formatFileSize } from './utils';

/**
 * Every file format the app accepts, in one place. Add a format here and
 * validation, attachment previews and file-picker filters all pick it up.
 */
export type AttachmentKind = 'audio' | 'image' | 'pdf' | 'text' | 'unknown';

const FORMATS: Record<string, { kind: AttachmentKind; track?: 'lossy' | 'lossless' }> = {
  mp3: { kind: 'audio', track: 'lossy' },
  m4a: { kind: 'audio', track: 'lossy' },
  aac: { kind: 'audio', track: 'lossy' },
  ogg: { kind: 'audio', track: 'lossy' },
  wav: { kind: 'audio', track: 'lossless' },
  flac: { kind: 'audio', track: 'lossless' },
  webm: { kind: 'audio' }, // browser voice recordings
  png: { kind: 'image' },
  jpg: { kind: 'image' },
  jpeg: { kind: 'image' },
  gif: { kind: 'image' },
  webp: { kind: 'image' },
  pdf: { kind: 'pdf' },
  txt: { kind: 'text' },
};

const MB = 1024 * 1024;
const LIMITS = {
  track: { maxBytes: 200 * MB, label: 'File' },
  attachment: { maxBytes: 50 * MB, label: 'Attachment' },
} as const;

export type UploadPurpose = keyof typeof LIMITS;

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

function isAllowed(ext: string, purpose: UploadPurpose): boolean {
  const format = FORMATS[ext];
  return purpose === 'track' ? !!format?.track : !!format;
}

const ALLOWED = (purpose: UploadPurpose) =>
  Object.keys(FORMATS).filter((ext) => isAllowed(ext, purpose));

/** Returns an error message, or null if the file can be uploaded for `purpose`. */
export function validateUpload(file: File, purpose: UploadPurpose): string | null {
  const { maxBytes, label } = LIMITS[purpose];
  if (file.size > maxBytes) {
    return `${label} exceeds ${formatFileSize(maxBytes)} limit (${formatFileSize(file.size)})`;
  }
  if (!isAllowed(extensionOf(file.name), purpose)) {
    return purpose === 'track'
      ? `Unsupported format. Allowed formats: ${ALLOWED('track').join(', ')}`
      : 'Unsupported format. Allowed: audio, images (PNG, JPG), PDF, text files';
  }
  return null;
}

/** Value for an <input type="file" accept> attribute. */
export function acceptAttribute(purpose: UploadPurpose): string {
  return ALLOWED(purpose).map((ext) => `.${ext}`).join(',');
}

/** How an attachment should be previewed. */
export function attachmentKind(fileName: string): AttachmentKind {
  return FORMATS[extensionOf(fileName)]?.kind ?? 'unknown';
}

/** Lossless tracks are converted to MP3 for streaming; the original is kept for download. */
export function isLossless(fileName: string): boolean {
  return FORMATS[extensionOf(fileName)]?.track === 'lossless';
}
