import { useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { MentionInput } from './MentionInput';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';
import { useAnonymousIdentity } from '@/hooks/useAnonymousIdentity';
import { commentCreateOptimistic } from '@/lib/optimisticUpdates';
import { formatDuration, formatFileSize, validateAttachmentFile, getAttachmentType } from '@/lib/utils';
import { Send, X, Clock, Paperclip, FileAudio, Image, FileText, File, Loader2 } from 'lucide-react';
import type { TrackId, VersionId, CommentId } from '@/types';

interface CommentFormProps {
  versionId: VersionId;
  trackId: TrackId;
  timestamp?: number;
  parentCommentId?: CommentId;
  onSubmit?: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

const attachmentTypeIcons = {
  audio: FileAudio,
  image: Image,
  pdf: FileText,
  text: FileText,
  unknown: File,
};

export function CommentForm({
  versionId,
  trackId,
  timestamp,
  parentCommentId,
  onSubmit,
  onCancel,
  placeholder = 'Add a comment...',
}: CommentFormProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewer = useQuery(api.users.viewer);
  const anonymousIdentity = useAnonymousIdentity();
  const displayName = viewer?.name ?? anonymousIdentity.name;
  const createComment = useMutation(api.comments.create).withOptimisticUpdate(
    (localStore, args) =>
      commentCreateOptimistic(
        localStore,
        args,
        displayName,
        viewer?._id,
      ),
  );
  const participants = useQuery(api.users.getTrackParticipants, { trackId });
  const { uploadAttachment, uploading, progress, error: uploadError } = useAttachmentUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid file');
      return;
    }

    setError(null);
    setAttachmentFile(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      let attachmentR2Key: string | undefined;
      let attachmentFileName: string | undefined;

      if (attachmentFile) {
        const result = await uploadAttachment(attachmentFile);
        attachmentR2Key = result.r2Key;
        attachmentFileName = result.fileName;
      }

      const commentText = text.trim();

      // Clear form immediately for optimistic feel
      setText('');
      setAttachmentFile(null);
      onSubmit?.();

      await createComment({
        versionId,
        trackId,
        commentText,
        timestamp,
        parentCommentId,
        attachmentR2Key,
        attachmentFileName,
        // Pass anonymous identity if not logged in
        ...(viewer ? {} : {
          anonymousId: anonymousIdentity.id,
          anonymousName: anonymousIdentity.name,
        }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const AttachmentIcon = attachmentFile
    ? attachmentTypeIcons[getAttachmentType(attachmentFile.name)]
    : File;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {timestamp !== undefined && (
        <div className="flex items-center gap-1 text-xs text-studio-accent-cyan mono">
          <Clock className="w-3 h-3" />
          at {formatDuration(timestamp)}
        </div>
      )}

      <div className="flex gap-2">
        {participants && participants.length > 0 ? (
          <MentionInput
            value={text}
            onChange={setText}
            participants={participants}
            placeholder={placeholder}
            rows={2}
            disabled={submitting || uploading}
            className="input flex-1 resize-none text-sm"
          />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="input flex-1 resize-none text-sm"
            disabled={submitting || uploading}
          />
        )}
        <div className="flex flex-col gap-1">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!text.trim() || submitting || uploading}
          >
            {submitting || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting || uploading}
            className="p-1.5 rounded text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-dark transition-colors disabled:opacity-50"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept=".mp3,.wav,.flac,.m4a,.aac,.ogg,.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt"
        className="hidden"
      />

      {/* Attachment preview */}
      {attachmentFile && (
        <div className="flex items-center gap-2 bg-studio-dark border border-studio-gray rounded-lg px-3 py-2 text-sm">
          <AttachmentIcon className="w-4 h-4 text-studio-accent-cyan flex-shrink-0" />
          <span className="truncate flex-1">{attachmentFile.name}</span>
          <span className="text-xs text-studio-text-secondary flex-shrink-0">
            {formatFileSize(attachmentFile.size)}
          </span>
          {uploading ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1.5 bg-studio-gray rounded-full overflow-hidden">
                <div
                  className="h-full bg-studio-accent rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-studio-text-secondary mono">{Math.round(progress)}%</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAttachmentFile(null)}
              className="text-studio-text-secondary hover:text-red-400 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {(error || uploadError) && (
        <p className="text-xs text-red-400">{error || uploadError}</p>
      )}
    </form>
  );
}
