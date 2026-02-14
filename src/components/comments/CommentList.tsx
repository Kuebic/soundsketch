import { Loader2 } from 'lucide-react';
import { CommentItem } from './CommentItem';
import type { Comment, TrackId, VersionId, UserId } from '@/types';

interface CommentListProps {
  comments: Comment[] | undefined;
  currentUserId?: UserId;
  currentAnonymousId?: string;
  isTrackOwner?: boolean;
  onTimestampClick?: (timestamp: number) => void;
  versionId: VersionId;
  trackId: TrackId;
  emptyMessage?: string;
}

export function CommentList({
  comments,
  currentUserId,
  currentAnonymousId,
  isTrackOwner,
  onTimestampClick,
  versionId,
  trackId,
  emptyMessage = 'No comments yet.',
}: CommentListProps) {
  if (comments === undefined) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-studio-text-secondary" />
      </div>
    );
  }

  const topLevel = comments.filter((c) => !c.parentCommentId);

  if (topLevel.length === 0) {
    return (
      <p className="text-sm text-studio-text-secondary py-4">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
      {topLevel.map((comment) => (
        <CommentItem
          key={comment._id}
          comment={comment}
          currentUserId={currentUserId}
          currentAnonymousId={currentAnonymousId}
          isTrackOwner={isTrackOwner}
          onTimestampClick={onTimestampClick}
          versionId={versionId}
          trackId={trackId}
        />
      ))}
    </div>
  );
}
