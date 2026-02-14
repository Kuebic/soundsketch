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
    anonymousId: v.optional(v.string()),
    anonymousName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Allow guest comments on public/unlisted tracks
    const userId = await getAuthUserId(ctx);
    let authorId: Id<"users"> | undefined;
    let authorName = "Anonymous";
    let anonymousId: string | undefined;

    if (userId) {
      const user = await ctx.db.get(userId);
      if (user) {
        authorId = user._id;
        authorName = user.name ?? "Anonymous";
      }
      // No anonymousId for authenticated users
    } else {
      // Guest: use provided anonymous info
      anonymousId = args.anonymousId;
      authorName = args.anonymousName ?? "Anonymous";
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
      anonymousId,
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
 * Get the count of replies to a comment
 */
export const getReplyCount = query({
  args: { parentCommentId: v.id("comments") },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentCommentId", args.parentCommentId))
      .collect();
    return replies.length;
  },
});

/**
 * Delete a comment
 */
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Check if user is comment author or track owner
    const track = await ctx.db.get(comment.trackId);
    const isTrackOwner = userId && track?.creatorId === userId;

    // Check authorization
    let isAuthor = false;
    if (userId) {
      isAuthor = comment.authorId === userId;
    } else if (args.anonymousId && comment.anonymousId) {
      isAuthor = comment.anonymousId === args.anonymousId;
    }

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
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Authorization check
    if (userId) {
      // Logged in: must be comment author
      if (comment.authorId !== userId) {
        throw new Error("Not authorized");
      }
    } else {
      // Guest: must match anonymousId AND comment must have anonymousId
      if (!comment.anonymousId || comment.anonymousId !== args.anonymousId) {
        throw new Error("Not authorized");
      }
    }

    await ctx.db.patch(args.commentId, {
      commentText: args.commentText,
      ...(args.timestamp !== undefined && { timestamp: args.timestamp }),
    });
  },
});

/**
 * Claim all anonymous comments for the current authenticated user.
 * Called after signup/login when user has localStorage anonymousId.
 */
export const claimAnonymousComments = mutation({
  args: {
    anonymousId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated to claim comments");
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(args.anonymousId)) {
      throw new Error("Invalid anonymousId format");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const authorName = user.name ?? "Anonymous";

    // Find all comments with this anonymousId
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_anonymous_id", (q) => q.eq("anonymousId", args.anonymousId))
      .collect();

    // Update each unclaimed comment to belong to the authenticated user
    let claimedCount = 0;
    for (const comment of comments) {
      if (!comment.authorId) {
        await ctx.db.patch(comment._id, {
          authorId: userId,
          authorName: authorName,
          anonymousId: undefined,
        });
        claimedCount++;
      }
    }

    return { claimedCount };
  },
});
