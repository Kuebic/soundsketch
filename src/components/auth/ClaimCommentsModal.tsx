import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { cn, formatDuration, formatRelativeTime } from '@/lib/utils';
import { clearAnonymousIdentity } from '@/lib/anonymousUser';
import { Check, Clock, FileAudio, Loader2 } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';

interface ClaimCommentsModalProps {
  isOpen: boolean;
  onComplete: () => void;
  anonymousId: string;
}

export function ClaimCommentsModal({ isOpen, onComplete, anonymousId }: ClaimCommentsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const comments = useQuery(api.comments.getAnonymousCommentsForClaiming, { anonymousId });
  const claimMutation = useMutation(api.comments.claimAnonymousComments);

  // Initialize selection when comments load (select all by default)
  useEffect(() => {
    if (comments && !initialized) {
      setSelectedIds(new Set(comments.map((c) => c._id)));
      setInitialized(true);
    }
  }, [comments, initialized]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleComment = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (comments) {
      if (selectedIds.size === comments.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(comments.map((c) => c._id)));
      }
    }
  };

  const handleClaimSelected = async () => {
    if (!comments) return;
    try {
      setSubmitting(true);
      const commentIds = Array.from(selectedIds) as Id<"comments">[];
      await claimMutation({ anonymousId, commentIds });
      clearAnonymousIdentity();
      const claimed = selectedIds.size;
      if (claimed > 0) {
        toast.success(`Claimed ${claimed} comment${claimed === 1 ? '' : 's'}`);
      }
      onComplete();
    } catch {
      toast.error('Failed to claim comments');
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setSubmitting(true);
      await claimMutation({ anonymousId, declineAll: true });
      clearAnonymousIdentity();
      onComplete();
    } catch {
      toast.error('Failed to process');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Loading state
  if (comments === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <div className="relative bg-studio-darker border border-studio-gray rounded-xl shadow-2xl w-full max-w-lg animate-slide-up">
          <div className="flex items-center justify-between p-6 border-b border-studio-gray">
            <h2 className="text-xl font-bold">Claim Your Comments</h2>
          </div>
          <div className="p-6">
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-studio-text-secondary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No comments to claim - auto-complete
  if (comments.length === 0) {
    clearAnonymousIdentity();
    onComplete();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - no onClick to prevent closing */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-studio-darker border border-studio-gray rounded-xl shadow-2xl w-full max-w-lg animate-slide-up">
        {/* Header - no close button */}
        <div className="flex items-center justify-between p-6 border-b border-studio-gray">
          <h2 className="text-xl font-bold">Claim Your Comments</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-studio-text-secondary">
            We found {comments.length} comment{comments.length === 1 ? '' : 's'} you made before signing in.
            Would you like to link {comments.length === 1 ? 'it' : 'them'} to your account?
          </p>

          {/* Select All toggle */}
          <div className="flex items-center justify-between border-b border-studio-gray pb-2">
            <button
              onClick={toggleAll}
              className="text-sm text-studio-accent hover:underline"
            >
              {selectedIds.size === comments.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-studio-text-secondary">
              {selectedIds.size} of {comments.length} selected
            </span>
          </div>

          {/* Comment list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {comments.map((comment) => (
              <label
                key={comment._id}
                className="flex items-start gap-3 p-3 bg-studio-dark border border-studio-gray rounded-lg cursor-pointer hover:border-studio-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      selectedIds.has(comment._id)
                        ? 'bg-studio-accent border-studio-accent'
                        : 'border-studio-gray'
                    )}
                  >
                    {selectedIds.has(comment._id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(comment._id)}
                    onChange={() => toggleComment(comment._id)}
                    className="sr-only"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-studio-text-secondary mb-1">
                    <span className="font-medium text-studio-text-primary truncate">
                      {comment.trackTitle}
                    </span>
                    {comment.timestamp !== undefined && (
                      <span className="flex items-center gap-0.5 text-studio-accent-cyan">
                        <Clock className="w-3 h-3" />
                        {formatDuration(comment.timestamp)}
                      </span>
                    )}
                    <span>{formatRelativeTime(comment._creationTime)}</span>
                  </div>
                  {comment.hasAttachment ? (
                    <div className="flex items-center gap-1.5 text-sm text-studio-text-secondary">
                      <FileAudio className="w-4 h-4 text-studio-accent-cyan" />
                      <span className="italic">Audio comment</span>
                    </div>
                  ) : (
                    <p className="text-sm text-studio-text-secondary line-clamp-2">
                      {comment.commentText || '(empty comment)'}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              onClick={handleClaimSelected}
              disabled={submitting || selectedIds.size === 0}
              className="flex-1"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `Claim${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSkip}
              disabled={submitting}
            >
              No Thanks
            </Button>
          </div>

          <p className="text-xs text-studio-text-secondary text-center">
            Skipped comments will remain anonymous and cannot be claimed later.
          </p>
        </div>
      </div>
    </div>
  );
}
