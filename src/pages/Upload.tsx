import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Navbar } from '@/components/layout/Navbar';
import { FileDropZone } from '@/components/upload/FileDropZone';
import { Button } from '@/components/ui/Button';
import { Loader2, Globe, Link2, Lock, Download } from 'lucide-react';

export function Upload() {
  const viewer = useQuery(api.users.viewer);
  const navigate = useNavigate();
  const createTrack = useMutation(api.tracks.create);
  const { uploadFile, uploading, progress, stage, error: uploadError } = useFileUpload();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("unlisted");
  const [versionName, setVersionName] = useState('v1');
  const [downloadsEnabled, setDownloadsEnabled] = useState(false);

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
        visibility,
        downloadsEnabled,
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

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <div className="flex gap-3">
              {([
                { value: "public", label: "Public", Icon: Globe },
                { value: "unlisted", label: "Unlisted", Icon: Link2 },
                { value: "private", label: "Private", Icon: Lock },
              ] as const).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVisibility(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    visibility === value
                      ? 'bg-studio-accent text-white'
                      : 'bg-studio-dark text-studio-text-secondary border border-studio-gray'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-studio-text-secondary mt-1.5">
              {visibility === "public" && "Anyone can discover this track on the home page."}
              {visibility === "unlisted" && "Only people with the link can view this track."}
              {visibility === "private" && "Only you and invited collaborators can access this track."}
            </p>
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

          {/* Downloads */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setDownloadsEnabled(!downloadsEnabled)}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                downloadsEnabled
                  ? 'bg-studio-accent border-studio-accent'
                  : 'border-studio-gray hover:border-studio-text-secondary'
              }`}
            >
              {downloadsEnabled && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer" onClick={() => setDownloadsEnabled(!downloadsEnabled)}>
                <Download className="w-4 h-4" />
                Allow downloads
              </label>
              <p className="text-xs text-studio-text-secondary mt-0.5">
                Viewers can download the original audio file (WAV/FLAC files are converted to MP3 for streaming but originals are preserved for download)
              </p>
            </div>
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
                {stage === 'converting' ? 'Converting to MP3...' : 'Uploading...'} {Math.round(progress)}%
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
