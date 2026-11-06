import { Loader2 } from 'lucide-react';
import { CommentItem } from './CommentItem';
import type { CommentThread, TrackId, VersionId } from '@/types';

interface CommentListProps {
  threads: CommentThread[] | undefined;
  anonymousId?: string;
  onTimestampClick?: (timestamp: number) => void;
  versionId: VersionId;
  trackId: TrackId;
  emptyMessage?: string;
}

export function CommentList({
  threads,
  anonymousId,
  onTimestampClick,
  versionId,
  trackId,
  emptyMessage = 'No comments yet.',
}: CommentListProps) {
  if (threads === undefined) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-studio-text-secondary" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <p className="text-sm text-studio-text-secondary py-4">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <CommentItem
          key={thread._id}
          comment={thread}
          replies={thread.replies}
          anonymousId={anonymousId}
          onTimestampClick={onTimestampClick}
          versionId={versionId}
          trackId={trackId}
        />
      ))}
    </div>
  );
}
