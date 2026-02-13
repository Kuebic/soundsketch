import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import { Send, X, Clock } from 'lucide-react';
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
  const createComment = useMutation(api.comments.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await createComment({
        versionId,
        trackId,
        commentText: text.trim(),
        timestamp,
        parentCommentId,
      });
      setText('');
      onSubmit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {timestamp !== undefined && (
        <div className="flex items-center gap-1 text-xs text-studio-accent-cyan mono">
          <Clock className="w-3 h-3" />
          at {formatDuration(timestamp)}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="input flex-1 resize-none text-sm"
          disabled={submitting}
        />
        <div className="flex flex-col gap-1">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!text.trim() || submitting}
          >
            <Send className="w-4 h-4" />
          </Button>
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

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </form>
  );
}
