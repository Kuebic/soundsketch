import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkRateLimit } from "./lib/rateLimit";

/**
 * Create a new comment (timestamp or general)
 */
export const create = mutation({
  args: {
    versionId: v.id("versions"),
    trackId: v.id("tracks"),
    commentText: v.string(),
    timestamp: v.optional(v.number()),
    parentCommentId: v.optional(v.id("comments")),
    attachmentR2Key: v.optional(v.string()),
    attachmentFileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Allow guest comments on public/unlisted tracks
    const userId = await getAuthUserId(ctx);
    let authorId: Id<"users"> | undefined;
    let authorName = "Anonymous";

    if (userId) {
      const user = await ctx.db.get(userId);
      if (user) {
        authorId = user._id;
        authorName = user.name ?? "Anonymous";
      }
    }

    // Private tracks require authentication + creator/collaborator access
    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    if (track.visibility === "private") {
      if (!userId) throw new Error("Authentication required to comment on private tracks");
      const isCreator = track.creatorId === userId;
      const hasAccess = await ctx.db
        .query("trackAccess")
        .withIndex("by_track_and_user", (q) =>
          q.eq("trackId", args.trackId).eq("userId", userId)
        )
        .first();
      if (!isCreator && !hasAccess) {
        throw new Error("Not authorized to comment on this track");
      }
    }

    // Rate limit: 10/min for authenticated users, 5/min per track for guests
    if (userId) {
      await checkRateLimit(ctx, `comment:${userId}`, 10, 60_000);
    } else {
      await checkRateLimit(ctx, `comment:guest:${args.trackId}`, 5, 60_000);
    }

    const commentId = await ctx.db.insert("comments", {
      versionId: args.versionId,
      trackId: args.trackId,
      authorId,
      authorName,
      commentText: args.commentText,
      timestamp: args.timestamp,
      parentCommentId: args.parentCommentId,
      attachmentR2Key: args.attachmentR2Key,
      attachmentFileName: args.attachmentFileName,
    });

    return commentId;
  },
});

/**
 * Get all comments for a version (with option to include all versions)
 */
export const getByVersion = query({
  args: {
    versionId: v.id("versions"),
    includeAllVersions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeAllVersions) {
      // Get version to find trackId
      const version = await ctx.db.get(args.versionId);
      if (!version) return [];

      return ctx.db
        .query("comments")
        .withIndex("by_track", (q) => q.eq("trackId", version.trackId))
        .collect();
    }

    return ctx.db
      .query("comments")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();
  },
});

/**
 * Get timestamp comments for a version (sorted by timestamp)
 */
export const getTimestampComments = query({
  args: {
    versionId: v.id("versions"),
    includeAllVersions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let comments;
    if (args.includeAllVersions) {
      const version = await ctx.db.get(args.versionId);
      if (!version) return [];
      comments = await ctx.db
        .query("comments")
        .withIndex("by_track", (q) => q.eq("trackId", version.trackId))
        .collect();
    } else {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
        .collect();
    }

    return comments
      .filter((c) => c.timestamp !== undefined)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  },
});

/**
 * Get general comments for a version (no timestamp)
 */
export const getGeneralComments = query({
  args: {
    versionId: v.id("versions"),
    includeAllVersions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let comments;
    if (args.includeAllVersions) {
      const version = await ctx.db.get(args.versionId);
      if (!version) return [];
      comments = await ctx.db
        .query("comments")
        .withIndex("by_track", (q) => q.eq("trackId", version.trackId))
        .collect();
    } else {
      comments = await ctx.db
        .query("comments")
        .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
        .collect();
    }

    return comments.filter((c) => c.timestamp === undefined);
  },
});

/**
 * Get replies to a comment
 */
export const getReplies = query({
  args: { parentCommentId: v.id("comments") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentCommentId", args.parentCommentId))
      .collect();
  },
});

/**
 * Delete a comment
 */
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Check if user is comment author or track owner
    const track = await ctx.db.get(comment.trackId);
    const isAuthor = comment.authorId === userId;
    const isTrackOwner = track?.creatorId === userId;

    if (!isAuthor && !isTrackOwner) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.commentId);
  },
});

/**
 * Update a comment
 */
export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    commentText: v.string(),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Only comment author can edit
    if (comment.authorId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.commentId, {
      commentText: args.commentText,
      ...(args.timestamp !== undefined && { timestamp: args.timestamp }),
    });
  },
});
