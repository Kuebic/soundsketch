import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { CommentForm } from './CommentForm';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { Clock, Reply, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import type { Comment, TrackId, VersionId, UserId } from '@/types';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: UserId;
  isTrackOwner?: boolean;
  onTimestampClick?: (timestamp: number) => void;
  versionId: VersionId;
  trackId: TrackId;
}

export function CommentItem({
  comment,
  currentUserId,
  isTrackOwner,
  onTimestampClick,
  versionId,
  trackId,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.commentText);
  const [deleting, setDeleting] = useState(false);

  const replies = useQuery(
    api.comments.getReplies,
    showReplies ? { parentCommentId: comment._id } : 'skip'
  );
  const deleteComment = useMutation(api.comments.deleteComment);
  const updateComment = useMutation(api.comments.updateComment);

  const canModify = currentUserId === comment.authorId;
  const canDelete = canModify || isTrackOwner;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteComment({ commentId: comment._id });
    } catch {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await updateComment({ commentId: comment._id, commentText: editText.trim() });
      setEditing(false);
    } catch {
      // keep editing mode on failure
    }
  };

  return (
    <div className="border-l-2 border-studio-gray pl-4 py-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium">{comment.authorName}</span>
        <span className="text-xs text-studio-text-secondary">
          {formatRelativeTime(comment._creationTime)}
        </span>
        {comment.timestamp !== undefined && (
          <button
            onClick={() => onTimestampClick?.(comment.timestamp!)}
            className="flex items-center gap-0.5 text-xs text-studio-accent-cyan hover:text-studio-accent mono"
          >
            <Clock className="w-3 h-3" />
            {formatDuration(comment.timestamp)}
          </button>
        )}
      </div>

      {/* Body */}
      {editing ? (
        <div className="space-y-2 mb-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="input w-full text-sm resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleSaveEdit} disabled={!editText.trim()}>
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setEditText(comment.commentText); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-studio-text-secondary mb-2 whitespace-pre-wrap">
          {comment.commentText}
        </p>
      )}

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="flex items-center gap-1 text-xs text-studio-text-secondary hover:text-studio-text-primary"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
          {canModify && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-studio-text-secondary hover:text-studio-text-primary"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-studio-text-secondary hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-3 ml-2">
          <CommentForm
            versionId={versionId}
            trackId={trackId}
            parentCommentId={comment._id}
            placeholder="Write a reply..."
            onSubmit={() => {
              setShowReplyForm(false);
              setShowReplies(true);
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Replies */}
      {!comment.parentCommentId && (
        <div className="mt-2">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-studio-text-secondary hover:text-studio-text-primary"
          >
            {showReplies ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {showReplies ? 'Hide replies' : 'Show replies'}
          </button>

          {showReplies && replies && replies.length > 0 && (
            <div className="mt-2 space-y-2 ml-2">
              {replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  currentUserId={currentUserId}
                  isTrackOwner={isTrackOwner}
                  onTimestampClick={onTimestampClick}
                  versionId={versionId}
                  trackId={trackId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
