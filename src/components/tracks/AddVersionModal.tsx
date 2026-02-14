import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { FileDropZone } from '@/components/upload/FileDropZone';
import { Button } from '@/components/ui/Button';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Loader2 } from 'lucide-react';
import type { TrackId } from '@/types';

interface AddVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: TrackId;
}

export function AddVersionModal({ isOpen, onClose, trackId }: AddVersionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const { uploadFile, uploading, progress, stage, error } = useFileUpload();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !versionName.trim()) return;

    try {
      await uploadFile(file, trackId, versionName.trim(), changeNotes.trim() || undefined);
      setFile(null);
      setVersionName('');
      setChangeNotes('');
      toast.success('Version uploaded');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Version" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <FileDropZone
          file={file}
          onFileSelect={setFile}
          onFileClear={() => setFile(null)}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Version Name *</label>
          <input
            type="text"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder='e.g., "v2", "Final Mix", "Mastered"'
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">What changed?</label>
          <textarea
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="Optional notes about this version"
            rows={2}
            className="input w-full resize-none"
          />
        </div>

        {uploading && (
          <div className="space-y-1">
            <div className="w-full bg-studio-dark rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-studio-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-studio-text-secondary mono text-center">
              {stage === 'converting' ? 'Converting to MP3...' : 'Uploading...'} {Math.round(progress)}%
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!file || !versionName.trim() || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            'Upload Version'
          )}
        </Button>
      </form>
    </Modal>
  );
}
