import { useRef, useState } from 'react';
import { Upload, X, FileAudio } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { acceptAttribute, maxUploadBytes, validateUpload } from '@/lib/fileTypes';

interface FileDropZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  error?: string | null;
}

// Derived from the fileTypes registry so the pills never drift from validation.
const TRACK_FORMATS = acceptAttribute('track')
  .split(',')
  .map((ext) => ext.replace('.', '').toUpperCase());

export function FileDropZone({ file, onFileSelect, onFileClear, error }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    const invalid = validateUpload(f, 'track');
    if (invalid) {
      setValidationError(invalid);
      return;
    }
    setValidationError(null);
    onFileSelect(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const openPicker = () => inputRef.current?.click();

  const displayError = error || validationError;

  if (file) {
    return (
      <div className="flex items-center gap-3 sm:gap-4 rounded-xl border border-studio-gray bg-studio-dark/60 p-3.5 sm:p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-studio-accent/15">
          <FileAudio className="w-5 h-5 text-studio-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-studio-text-secondary font-mono">{formatFileSize(file.size)}</p>
        </div>
        <button
          type="button"
          aria-label="Remove file"
          title="Remove file"
          onClick={() => {
            onFileClear();
            setValidationError(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="flex-shrink-0 rounded-lg p-1.5 text-studio-text-secondary transition-colors hover:bg-studio-gray hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose an audio file to upload"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-darker ${
          dragOver
            ? 'border-studio-accent bg-studio-accent/5'
            : 'border-studio-gray hover:border-studio-text-secondary hover:bg-studio-dark/40'
        }`}
      >
        <Upload className="w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-3 text-studio-text-secondary" />
        <p className="text-sm font-medium mb-3">
          Drag & drop your audio file here, or <span className="text-studio-accent">click to browse</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
          {TRACK_FORMATS.map((format) => (
            <span
              key={format}
              className="rounded-md border border-studio-gray bg-studio-dark px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-studio-text-secondary"
            >
              {format}
            </span>
          ))}
        </div>
        <p className="text-xs text-studio-text-secondary">
          Up to {formatFileSize(maxUploadBytes('track'))}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute('track')}
        onChange={handleChange}
        className="hidden"
      />

      {displayError && (
        <p role="alert" className="text-xs text-red-400 mt-2">{displayError}</p>
      )}
    </div>
  );
}
