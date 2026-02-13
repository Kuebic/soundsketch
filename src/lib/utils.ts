import { type ClassValue, clsx } from "clsx";

/**
 * Utility to combine class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format duration from seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate audio file format and size
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 200 * 1024 * 1024; // 200MB
  const allowedFormats = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds 200MB limit (${formatFileSize(file.size)})`,
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !allowedFormats.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported format. Allowed formats: ${allowedFormats.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate attachment file format and size
 */
export function validateAttachmentFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedFormats = [
    'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg',
    'png', 'jpg', 'jpeg', 'gif', 'webp',
    'pdf', 'txt',
  ];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Attachment exceeds 50MB limit (${formatFileSize(file.size)})`,
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !allowedFormats.includes(extension)) {
    return {
      valid: false,
      error: 'Unsupported format. Allowed: audio, images (PNG, JPG), PDF, text files',
    };
  }

  return { valid: true };
}

/**
 * Get the display category of an attachment file
 */
export function getAttachmentType(fileName: string): 'audio' | 'image' | 'pdf' | 'text' | 'unknown' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'unknown';
  if (['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'text';
  return 'unknown';
}

/**
 * Generate shareable link URL
 */
export function generateShareableLink(shareableId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/track/${shareableId}`;
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}
