import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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
    // Allow guest comments on public tracks
    const identity = await ctx.auth.getUserIdentity();
    let authorId: Id<"users"> | undefined;
    let authorName = "Anonymous";

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .first();

      if (user) {
        authorId = user._id;
        authorName = user.name;
      }
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
  args: { versionId: v.id("versions") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();

    return comments
      .filter((c) => c.timestamp !== undefined)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  },
});

/**
 * Get general comments for a version (no timestamp)
 */
export const getGeneralComments = query({
  args: { versionId: v.id("versions") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Check if user is comment author or track owner
    const track = await ctx.db.get(comment.trackId);
    const isAuthor = comment.authorId === user._id;
    const isTrackOwner = track?.creatorId === user._id;

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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Only comment author can edit
    if (comment.authorId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.commentId, {
      commentText: args.commentText,
    });
  },
});
