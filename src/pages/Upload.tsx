import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Navbar } from '@/components/layout/Navbar';
import { FileDropZone } from '@/components/upload/FileDropZone';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

export function Upload() {
  const viewer = useQuery(api.users.viewer);
  const navigate = useNavigate();
  const createTrack = useMutation(api.tracks.create);
  const { uploadFile, uploading, progress, error: uploadError } = useFileUpload();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [versionName, setVersionName] = useState('v1');

  // Auth guard
  if (viewer === undefined) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-studio-accent" />
        </div>
      </div>
    );
  }

  if (viewer === null) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    try {
      // Step 1: Create the track
      const { shareableId, trackId } = await createTrack({
        title: title.trim(),
        description: description.trim() || undefined,
        isPublic,
      });

      // Step 2: Upload file to R2 and save version metadata
      await uploadFile(file, trackId, versionName.trim() || 'v1');

      // Step 3: Navigate to the new track
      navigate(`/track/${shareableId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Upload Track</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Drop Zone */}
          <FileDropZone
            file={file}
            onFileSelect={setFile}
            onFileClear={() => setFile(null)}
          />

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Track title"
              className="input w-full"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this track about?"
              rows={3}
              className="input w-full resize-none"
            />
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium mb-2">Privacy</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isPublic
                    ? 'bg-studio-accent text-white'
                    : 'bg-studio-dark text-studio-text-secondary border border-studio-gray'
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !isPublic
                    ? 'bg-studio-accent text-white'
                    : 'bg-studio-dark text-studio-text-secondary border border-studio-gray'
                }`}
              >
                Private
              </button>
            </div>
          </div>

          {/* Version Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Version Name</label>
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="v1"
              className="input w-full"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-1">
              <div className="w-full bg-studio-dark rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-studio-accent rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-studio-text-secondary mono text-center">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Errors */}
          {uploadError && (
            <p className="text-sm text-red-400">{uploadError}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!file || !title.trim() || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              'Upload Track'
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
