import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkRateLimit } from "./lib/rateLimit";
import { readVersion, requireTrack, requireUserId, type TrackRole } from "./lib/access";
import { cascadeDelete } from "./lib/cascade";
import { isAttachmentKeyFor } from "./lib/storageKeys";

const MAX_COMMENT_LENGTH = 5000;
const MAX_GUEST_NAME_LENGTH = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Who is acting on a comment: a signed-in user, or a guest identified by the
 * browser-generated anonymousId they hold in localStorage.
 */
interface Commenter {
  userId: Id<"users"> | null;
  anonymousId: string | null;
}

async function resolveCommenter(ctx: QueryCtx, anonymousId?: string): Promise<Commenter> {
  const userId = await getAuthUserId(ctx);
  if (userId) return { userId, anonymousId: null };
  return { userId: null, anonymousId: anonymousId && UUID_RE.test(anonymousId) ? anonymousId : null };
}

function isAuthor(comment: Doc<"comments">, who: Commenter): boolean {
  if (who.userId) return comment.authorId === who.userId;
  return !comment.authorId && !!who.anonymousId && comment.anonymousId === who.anonymousId;
}

/** Comment as sent to clients: no storage key, no anonymousId, permissions attached. */
export interface CommentView {
  _id: Id<"comments">;
  _creationTime: number;
  versionId: Id<"versions">;
  authorId?: Id<"users">;
  authorName: string;
  commentText: string;
  timestamp?: number;
  parentCommentId?: Id<"comments">;
  attachmentFileName?: string;
  hasAttachment: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CommentThread extends CommentView {
  replies: CommentView[];
}

function toView(comment: Doc<"comments">, who: Commenter, role: TrackRole): CommentView {
  const author = isAuthor(comment, who);
  return {
    _id: comment._id,
    _creationTime: comment._creationTime,
    versionId: comment.versionId,
    authorId: comment.authorId,
    authorName: comment.authorName,
    commentText: comment.commentText,
    timestamp: comment.timestamp,
    parentCommentId: comment.parentCommentId,
    attachmentFileName: comment.attachmentFileName,
    hasAttachment: !!comment.attachmentR2Key,
    canEdit: author,
    canDelete: author || role === "owner",
  };
}

function cleanText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Comment cannot be empty");
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer`);
  }
  return trimmed;
}

function cleanTimestamp(timestamp: number): number {
  if (!Number.isFinite(timestamp) || timestamp < 0) throw new Error("Invalid timestamp");
  return timestamp;
}

/**
 * All comment threads for a version (or for every version of its track),
 * split into timestamped feedback (sorted by position) and general discussion
 * (sorted by time). Replies are nested under their thread.
 */
export const listThreads = query({
  args: {
    versionId: v.id("versions"),
    includeAllVersions: v.optional(v.boolean()),
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ timestamped: CommentThread[]; general: CommentThread[] }> => {
    const access = await readVersion(ctx, args.versionId);
    if (!access) return { timestamped: [], general: [] };
    const who = await resolveCommenter(ctx, args.anonymousId);

    const comments = args.includeAllVersions
      ? await ctx.db
          .query("comments")
          .withIndex("by_track", (q) => q.eq("trackId", access.track._id))
          .collect()
      : await ctx.db
          .query("comments")
          .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
          .collect();

    const threads = await Promise.all(
      comments
        .filter((c) => !c.parentCommentId)
        .map(async (root): Promise<CommentThread> => {
          const replies = await ctx.db
            .query("comments")
            .withIndex("by_parent", (q) => q.eq("parentCommentId", root._id))
            .collect();
          return {
            ...toView(root, who, access.role),
            replies: replies.map((r) => toView(r, who, access.role)),
          };
        }),
    );

    return {
      timestamped: threads
        .filter((t) => t.timestamp !== undefined)
        .sort((a, b) => a.timestamp! - b.timestamp!),
      general: threads.filter((t) => t.timestamp === undefined),
    };
  },
});

/**
 * Post a comment, timestamped comment, or reply. Guests may comment on
 * public/unlisted tracks; private tracks need owner or collaborator access.
 * Replies always attach to the thread root, on the root's version.
 */
export const create = mutation({
  args: {
    versionId: v.id("versions"),
    commentText: v.string(),
    timestamp: v.optional(v.number()),
    parentCommentId: v.optional(v.id("comments")),
    attachmentR2Key: v.optional(v.string()),
    attachmentFileName: v.optional(v.string()),
    anonymousId: v.optional(v.string()),
    anonymousName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("Version not found");
    const { track } = await requireTrack(ctx, version.trackId);
    const who = await resolveCommenter(ctx, args.anonymousId);

    let versionId = version._id;
    let parentCommentId: Id<"comments"> | undefined;
    let timestamp = args.timestamp === undefined ? undefined : cleanTimestamp(args.timestamp);
    if (args.parentCommentId) {
      const parent = await ctx.db.get(args.parentCommentId);
      if (!parent || parent.trackId !== track._id) throw new Error("Comment not found");
      const root = parent.parentCommentId ? await ctx.db.get(parent.parentCommentId) : parent;
      if (!root) throw new Error("Comment not found");
      parentCommentId = root._id;
      versionId = root.versionId;
      timestamp = undefined;
    }

    if (args.attachmentR2Key && !isAttachmentKeyFor(track._id, args.attachmentR2Key)) {
      throw new Error("Invalid attachment");
    }

    let authorName = "Anonymous";
    if (who.userId) {
      const user = await ctx.db.get(who.userId);
      authorName = user?.name ?? "Anonymous";
      await checkRateLimit(ctx, `comment:${who.userId}`, 10, 60_000);
    } else {
      authorName = args.anonymousName?.trim().slice(0, MAX_GUEST_NAME_LENGTH) || "Anonymous";
      await checkRateLimit(ctx, `comment:guest:${track._id}`, 5, 60_000);
    }

    return ctx.db.insert("comments", {
      versionId,
      trackId: track._id,
      authorId: who.userId ?? undefined,
      authorName,
      commentText: cleanText(args.commentText),
      timestamp,
      parentCommentId,
      attachmentR2Key: args.attachmentR2Key,
      attachmentFileName: args.attachmentR2Key ? args.attachmentFileName : undefined,
      anonymousId: who.anonymousId ?? undefined,
    });
  },
});

/** Edit a comment's text (and position, for timestamped comments). Author only. */
export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    commentText: v.string(),
    timestamp: v.optional(v.number()),
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (!isAuthor(comment, await resolveCommenter(ctx, args.anonymousId))) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.commentId, {
      commentText: cleanText(args.commentText),
      ...(args.timestamp !== undefined &&
        comment.timestamp !== undefined && { timestamp: cleanTimestamp(args.timestamp) }),
    });
  },
});

/** Delete a comment, its replies and attachments. Author or track owner. */
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const who = await resolveCommenter(ctx, args.anonymousId);
    const track = await ctx.db.get(comment.trackId);
    const isTrackOwner = !!who.userId && track?.creatorId === who.userId;
    if (!isAuthor(comment, who) && !isTrackOwner) throw new Error("Not authorized");

    await cascadeDelete(ctx, [{ kind: "comment", id: comment._id }]);
  },
});

async function claimableComments(ctx: QueryCtx, anonymousId: string) {
  if (!UUID_RE.test(anonymousId)) return [];
  const comments = await ctx.db
    .query("comments")
    .withIndex("by_anonymous_id", (q) => q.eq("anonymousId", anonymousId))
    .collect();
  // Not yet claimed by anyone, and not permanently declined
  return comments.filter((c) => !c.authorId && c.claimedByUser !== false);
}

/**
 * Guest comments that a newly signed-in user can claim as their own.
 * Used to display the claim prompt after login/signup.
 */
export const getAnonymousCommentsForClaiming = query({
  args: { anonymousId: v.string() },
  handler: async (ctx, args) => {
    const comments = await claimableComments(ctx, args.anonymousId);
    return Promise.all(
      comments.map(async (comment) => {
        const track = await ctx.db.get(comment.trackId);
        return {
          _id: comment._id,
          commentText: comment.commentText,
          authorName: comment.authorName,
          hasAttachment: !!comment.attachmentR2Key,
          attachmentFileName: comment.attachmentFileName,
          trackTitle: track?.title ?? "Unknown Track",
          timestamp: comment.timestamp,
          _creationTime: comment._creationTime,
        };
      }),
    );
  },
});

/**
 * Claim the listed guest comments for the signed-in user; every other
 * claimable comment for this anonymousId is permanently declined.
 */
export const claimAnonymousComments = mutation({
  args: {
    anonymousId: v.string(),
    commentIds: v.array(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!UUID_RE.test(args.anonymousId)) throw new Error("Invalid anonymousId format");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const claim = new Set<string>(args.commentIds);
    let claimedCount = 0;
    let declinedCount = 0;

    for (const comment of await claimableComments(ctx, args.anonymousId)) {
      if (claim.has(comment._id)) {
        await ctx.db.patch(comment._id, {
          authorId: userId,
          authorName: user.name ?? "Anonymous",
          anonymousId: undefined,
          claimedByUser: true,
        });
        claimedCount++;
      } else {
        await ctx.db.patch(comment._id, { claimedByUser: false });
        declinedCount++;
      }
    }

    return { claimedCount, declinedCount };
  },
});
