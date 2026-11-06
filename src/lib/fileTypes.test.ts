import { describe, expect, test } from 'vitest';
import { acceptAttribute, attachmentKind, isLossless, validateUpload } from './fileTypes';

const file = (name: string, size = 1) => ({ name, size }) as File;

describe('fileTypes', () => {
  test('tracks accept audio formats only, up to 200MB', () => {
    expect(validateUpload(file('song.MP3'), 'track')).toBeNull();
    expect(validateUpload(file('song.flac'), 'track')).toBeNull();
    expect(validateUpload(file('voice.webm'), 'track')).toMatch(/Unsupported format/);
    expect(validateUpload(file('cover.png'), 'track')).toMatch(/Unsupported format/);
    expect(validateUpload(file('big.wav', 201 * 1024 * 1024), 'track')).toMatch(/exceeds 200 MB/);
  });

  test('attachments accept audio, images, pdf and text, up to 50MB', () => {
    for (const name of ['memo.webm', 'mix.wav', 'cover.jpeg', 'notes.pdf', 'lyrics.txt']) {
      expect(validateUpload(file(name), 'attachment')).toBeNull();
    }
    expect(validateUpload(file('app.exe'), 'attachment')).toMatch(/Unsupported format/);
    expect(validateUpload(file('x.png', 51 * 1024 * 1024), 'attachment')).toMatch(/exceeds 50 MB/);
  });

  test('accept attributes match validation', () => {
    expect(acceptAttribute('track')).toBe('.mp3,.m4a,.aac,.ogg,.wav,.flac');
    expect(acceptAttribute('attachment').split(',')).toContain('.webm');
  });

  test('classifies attachments and lossless tracks', () => {
    expect(attachmentKind('a.GIF')).toBe('image');
    expect(attachmentKind('a.webm')).toBe('audio');
    expect(attachmentKind('README')).toBe('unknown');
    expect(isLossless('take.WAV')).toBe(true);
    expect(isLossless('take.mp3')).toBe(false);
  });
});
