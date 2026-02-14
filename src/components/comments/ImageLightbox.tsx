import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  fileName: string;
  onClose: () => void;
}

export function ImageLightbox({ src, fileName, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <span className="text-sm text-studio-text-secondary truncate max-w-[60%]">
          {fileName}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={src}
            download={fileName}
            className="p-2 rounded-lg text-studio-text-secondary hover:text-white hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-studio-text-secondary hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 min-h-0">
        <img
          src={src}
          alt={fileName}
          className="max-w-full max-h-full object-contain rounded"
        />
      </div>
    </div>
  );
}
