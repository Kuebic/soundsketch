import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { CommentForm } from './CommentForm';
import { ImageLightbox } from './ImageLightbox';
import { useAttachmentUrl } from '@/hooks/useAttachmentUrl';
import { formatDuration, formatRelativeTime, getAttachmentType } from '@/lib/utils';
import { Clock, Reply, Trash2, Pencil, ChevronDown, ChevronRight, Download, FileAudio, Image, FileText, File, Loader2 } from 'lucide-react';
import type { Comment, TrackId, VersionId, UserId } from '@/types';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: UserId;
  currentAnonymousId?: string;
  isTrackOwner?: boolean;
  onTimestampClick?: (timestamp: number) => void;
  versionId: VersionId;
  trackId: TrackId;
}

const attachmentTypeIcons = {
  audio: FileAudio,
  image: Image,
  pdf: FileText,
  text: FileText,
  unknown: File,
};

export function CommentItem({
  comment,
  currentUserId,
  currentAnonymousId,
  isTrackOwner,
  onTimestampClick,
  versionId,
  trackId,
}: CommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.commentText);
  const [editMinutes, setEditMinutes] = useState(() => Math.floor((comment.timestamp ?? 0) / 60));
  const [editSeconds, setEditSeconds] = useState(() => Math.floor((comment.timestamp ?? 0) % 60));
  const [deleting, setDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Only fetch reply count for top-level comments
  const replyCount = useQuery(
    api.comments.getReplyCount,
    !comment.parentCommentId ? { parentCommentId: comment._id } : 'skip'
  );
  const replies = useQuery(
    api.comments.getReplies,
    showReplies ? { parentCommentId: comment._id } : 'skip'
  );
  const deleteComment = useMutation(api.comments.deleteComment);
  const updateComment = useMutation(api.comments.updateComment);

  const hasAttachment = comment.attachmentR2Key && comment.attachmentFileName;
  const attachmentType = hasAttachment ? getAttachmentType(comment.attachmentFileName!) : 'unknown';
  const { url: attachmentUrl, loading: attachmentUrlLoading } = useAttachmentUrl(
    hasAttachment ? comment.attachmentR2Key! : undefined
  );
  const AttachmentIcon = hasAttachment
    ? attachmentTypeIcons[attachmentType]
    : File;

  // Fix: proper authorization check that handles anonymous users
  const canModify = useMemo(() => {
    // Logged in user: must match authorId (both must exist)
    if (currentUserId && comment.authorId) {
      return currentUserId === comment.authorId;
    }
    // Anonymous user: must have anonymousId AND it must match
    if (currentAnonymousId && comment.anonymousId) {
      return currentAnonymousId === comment.anonymousId;
    }
    // No match - cannot modify
    return false;
  }, [currentUserId, currentAnonymousId, comment.authorId, comment.anonymousId]);

  const canDelete = canModify || isTrackOwner;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteComment({
        commentId: comment._id,
        anonymousId: currentAnonymousId,
      });
    } catch {
      toast.error('Failed to delete comment');
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    try {
      const args: {
        commentId: typeof comment._id;
        commentText: string;
        timestamp?: number;
        anonymousId?: string;
      } = {
        commentId: comment._id,
        commentText: editText.trim(),
        anonymousId: currentAnonymousId,
      };
      if (comment.timestamp !== undefined) {
        args.timestamp = editMinutes * 60 + editSeconds;
      }
      await updateComment(args);
      setEditing(false);
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const renderCommentText = (text: string) => {
    // Split on @mentions — match @Word or @Multi Word (up to next @ or end)
    const parts = text.split(/(@\S+(?:\s\S+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-studio-accent font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="border-l-2 border-studio-gray pl-4 py-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-studio-text-secondary hover:text-studio-text-primary"
          aria-label={collapsed ? 'Expand comment' : 'Collapse comment'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
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

      {!collapsed && (
        <>
      {/* Body */}
      {editing ? (
        <div className="space-y-2 mb-2">
          {comment.timestamp !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-studio-text-secondary">
              <Clock className="w-3 h-3 text-studio-accent-cyan" />
              <input
                type="number"
                min={0}
                value={editMinutes}
                onChange={(e) => setEditMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="input w-12 text-center text-xs px-1 py-0.5"
                aria-label="Minutes"
              />
              <span className="font-mono">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={editSeconds.toString().padStart(2, '0')}
                onChange={(e) => setEditSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                className="input w-12 text-center text-xs px-1 py-0.5"
                aria-label="Seconds"
              />
            </div>
          )}
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
            <Button size="sm" variant="secondary" onClick={() => {
              setEditing(false);
              setEditText(comment.commentText);
              setEditMinutes(Math.floor((comment.timestamp ?? 0) / 60));
              setEditSeconds(Math.floor((comment.timestamp ?? 0) % 60));
            }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-studio-text-secondary mb-2 whitespace-pre-wrap">
          {renderCommentText(comment.commentText)}
        </p>
      )}

      {/* Attachment — Image */}
      {hasAttachment && attachmentType === 'image' && (
        <div className="mb-2 max-w-sm">
          {attachmentUrlLoading ? (
            <div className="h-48 bg-studio-dark border border-studio-gray rounded-lg animate-pulse" />
          ) : attachmentUrl ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block rounded-lg overflow-hidden border border-studio-gray hover:border-studio-accent transition-colors"
            >
              <img
                src={attachmentUrl}
                alt={comment.attachmentFileName}
                className="max-h-48 object-cover rounded-lg"
              />
            </button>
          ) : null}
          <div className="flex items-center gap-2 mt-1.5 text-sm">
            <Image className="w-3.5 h-3.5 text-studio-accent-cyan flex-shrink-0" />
            <span className="truncate flex-1 text-xs text-studio-text-secondary">
              {comment.attachmentFileName}
            </span>
            {attachmentUrl && (
              <a
                href={attachmentUrl}
                download={comment.attachmentFileName}
                className="text-studio-text-secondary hover:text-studio-accent flex-shrink-0"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          {lightboxOpen && attachmentUrl && (
            <ImageLightbox
              src={attachmentUrl}
              fileName={comment.attachmentFileName!}
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </div>
      )}

      {/* Attachment — Audio */}
      {hasAttachment && attachmentType === 'audio' && (
        <div className="mb-2 max-w-sm">
          {attachmentUrlLoading ? (
            <div className="h-12 bg-studio-dark border border-studio-gray rounded-lg animate-pulse" />
          ) : attachmentUrl ? (
            <audio
              controls
              preload="metadata"
              src={attachmentUrl}
              className="w-full h-10 rounded-lg"
            />
          ) : null}
          <div className="flex items-center gap-2 mt-1.5 text-sm">
            <FileAudio className="w-3.5 h-3.5 text-studio-accent-cyan flex-shrink-0" />
            <span className="truncate flex-1 text-xs text-studio-text-secondary">
              {comment.attachmentFileName}
            </span>
            {attachmentUrl && (
              <a
                href={attachmentUrl}
                download={comment.attachmentFileName}
                className="text-studio-text-secondary hover:text-studio-accent flex-shrink-0"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Attachment — Other (PDF, text, unknown) */}
      {hasAttachment && attachmentType !== 'image' && attachmentType !== 'audio' && (
        <div className="flex items-center gap-2 bg-studio-dark border border-studio-gray rounded-lg px-3 py-2 text-sm mb-2 max-w-sm">
          <AttachmentIcon className="w-4 h-4 text-studio-accent-cyan flex-shrink-0" />
          <span className="truncate flex-1">{comment.attachmentFileName}</span>
          {attachmentUrl ? (
            <a
              href={attachmentUrl}
              download={comment.attachmentFileName}
              className="text-studio-text-secondary hover:text-studio-accent flex-shrink-0"
              title="Download attachment"
            >
              <Download className="w-4 h-4" />
            </a>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-studio-text-secondary flex-shrink-0" />
          )}
        </div>
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
      {!comment.parentCommentId && replyCount !== undefined && replyCount > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-studio-text-secondary hover:text-studio-text-primary"
          >
            {showReplies ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {showReplies ? 'Hide replies' : `Show replies (${replyCount})`}
          </button>

          {showReplies && replies && replies.length > 0 && (
            <div className="mt-2 space-y-2 ml-2">
              {replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  currentUserId={currentUserId}
                  currentAnonymousId={currentAnonymousId}
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
        </>
      )}
    </div>
  );
}
