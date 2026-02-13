import { useRef, useState } from 'react';
import { Upload, X, FileAudio } from 'lucide-react';
import { validateAudioFile, formatFileSize } from '@/lib/utils';

interface FileDropZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  error?: string | null;
}

export function FileDropZone({ file, onFileSelect, onFileClear, error }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    const result = validateAudioFile(f);
    if (!result.valid) {
      setValidationError(result.error || 'Invalid file');
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

  const displayError = error || validationError;

  if (file) {
    return (
      <div className="card flex items-center gap-4">
        <FileAudio className="w-10 h-10 text-studio-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-studio-text-secondary">{formatFileSize(file.size)}</p>
        </div>
        <button
          onClick={() => {
            onFileClear();
            setValidationError(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="text-studio-text-secondary hover:text-red-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-studio-accent bg-studio-accent/5'
            : 'border-studio-gray hover:border-studio-text-secondary'
        }`}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-studio-text-secondary" />
        <p className="text-sm font-medium mb-1">
          Drag & drop your audio file here, or click to browse
        </p>
        <p className="text-xs text-studio-text-secondary">
          MP3, WAV, FLAC, M4A, AAC, OGG — up to 200MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.flac,.m4a,.aac,.ogg"
        onChange={handleChange}
        className="hidden"
      />

      {displayError && (
        <p className="text-xs text-red-400 mt-2">{displayError}</p>
      )}
    </div>
  );
}
