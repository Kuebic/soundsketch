import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Navbar } from '@/components/layout/Navbar';
import { FileDropZone } from '@/components/upload/FileDropZone';
import { Button } from '@/components/ui/Button';
import { Loader2, Globe, Link2, Lock } from 'lucide-react';

export function Upload() {
  const viewer = useQuery(api.users.viewer);
  const navigate = useNavigate();
  const createTrack = useMutation(api.tracks.create);
  const deleteTrack = useMutation(api.tracks.deleteTrack);
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

      // Step 2: Upload file to R2 and save version metadata.
      // Don't leave an empty track behind if this fails.
      try {
        await uploadFile(file, trackId, versionName.trim() || 'v1');
      } catch (err) {
        await deleteTrack({ trackId }).catch(() => {});
        throw err;
      }

      // Step 3: Navigate to the new track
      navigate(`/track/${shareableId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const canSubmit = !!file && !!title.trim() && !uploading;
  const missingHint = !file && !title.trim()
    ? 'Select an audio file and enter a title to upload.'
    : !file
      ? 'Select an audio file to upload.'
      : 'Enter a title to upload.';

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Upload Track</h1>
          <p className="text-sm text-studio-text-secondary mt-1">
            Share a new demo. You can add more versions later.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card hover:border-studio-gray hover:shadow-none space-y-6"
        >
          {/* File Drop Zone */}
          <FileDropZone
            file={file}
            onFileSelect={setFile}
            onFileClear={() => setFile(null)}
          />

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="upload-title" className="block text-sm font-medium mb-1.5">
                Title <span className="text-studio-accent">*</span>
              </label>
              <input
                id="upload-title"
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
              <label htmlFor="upload-description" className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                id="upload-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this track about?"
                rows={4}
                className="input w-full resize-y min-h-[6rem]"
              />
            </div>

            {/* Version Name */}
            <div>
              <label htmlFor="upload-version" className="block text-sm font-medium mb-1.5">Version Name</label>
              <input
                id="upload-version"
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="v1"
                className="input w-full"
              />
            </div>
          </div>

          <div className="space-y-5 border-t border-studio-gray pt-6">
            {/* Visibility */}
            <div>
              <span id="upload-visibility" className="block text-sm font-medium mb-2">Visibility</span>
              <div
                role="radiogroup"
                aria-labelledby="upload-visibility"
                className="grid grid-cols-3 gap-1 rounded-xl border border-studio-gray bg-studio-dark/60 p-1"
              >
                {([
                  { value: "public", label: "Public", Icon: Globe },
                  { value: "unlisted", label: "Unlisted", Icon: Link2 },
                  { value: "private", label: "Private", Icon: Lock },
                ] as const).map(({ value, label, Icon }, idx, options) => {
                  const selected = visibility === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setVisibility(value)}
                      onKeyDown={(e) => {
                        let nextIdx: number | null = null;
                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                          nextIdx = (idx + 1) % options.length;
                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                          nextIdx = (idx - 1 + options.length) % options.length;
                        }
                        if (nextIdx === null) return;
                        e.preventDefault();
                        setVisibility(options[nextIdx].value);
                        const radios = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
                        radios?.[nextIdx]?.focus();
                      }}
                      className={`flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent ${
                        selected
                          ? 'bg-studio-accent text-white shadow-sm'
                          : 'text-studio-text-secondary hover:bg-studio-gray/60 hover:text-studio-text-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-studio-text-secondary mt-2">
                {visibility === "public" && "Anyone can discover this track on the home page."}
                {visibility === "unlisted" && "Only people with the link can view this track."}
                {visibility === "private" && "Only you and invited collaborators can access this track."}
              </p>
            </div>

            {/* Downloads */}
            <div className="flex items-center justify-between gap-4 bg-studio-dark/60 border border-studio-gray rounded-xl p-3.5">
              <div className="min-w-0">
                <p id="upload-downloads-label" className="text-sm font-medium">Allow downloads</p>
                <p id="upload-downloads-desc" className="text-xs text-studio-text-secondary mt-0.5">
                  Viewers can download the original file. WAV and FLAC stream as MP3, but originals are kept for download.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={downloadsEnabled}
                aria-labelledby="upload-downloads-label"
                aria-describedby="upload-downloads-desc"
                onClick={() => setDownloadsEnabled(!downloadsEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-darker ${
                  downloadsEnabled
                    ? 'bg-studio-accent border-studio-accent'
                    : 'bg-studio-black border-studio-gray hover:border-studio-text-secondary'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    downloadsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
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
            <p role="alert" className="text-sm text-red-400">{uploadError}</p>
          )}

          {/* Submit */}
          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!canSubmit}
              aria-describedby={!canSubmit && !uploading ? 'upload-submit-hint' : undefined}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Track'
              )}
            </Button>
            {!canSubmit && !uploading && (
              <p id="upload-submit-hint" className="text-xs text-studio-text-secondary text-center mt-2">
                {missingHint}
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
