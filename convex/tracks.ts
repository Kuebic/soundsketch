import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nanoid } from "nanoid";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create a new track
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const shareableId = nanoid(10); // Short unique ID for URLs

    // Create track without latestVersionId initially
    const trackId = await ctx.db.insert("tracks", {
      title: args.title,
      description: args.description,
      creatorId: user._id,
      creatorName: user.name ?? "Unknown",
      isPublic: args.isPublic,
      shareableId,
      latestVersionId: undefined,
    });

    return { trackId, shareableId };
  },
});

/**
 * Get all public tracks
 */
export const getPublicTracks = query({
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(50);

    return tracks;
  },
});

/**
 * Get track by shareable ID with access control
 */
export const getByShareableId = query({
  args: { shareableId: v.string() },
  handler: async (ctx, args) => {
    const track = await ctx.db
      .query("tracks")
      .withIndex("by_shareable_id", (q) => q.eq("shareableId", args.shareableId))
      .first();

    if (!track) return null;

    // Check access permissions for private tracks
    if (!track.isPublic) {
      const userId = await getAuthUserId(ctx);
      if (!userId) return null;

      // Check if user is creator or has explicit access
      const isCreator = track.creatorId === userId;
      const hasAccess = await ctx.db
        .query("trackAccess")
        .withIndex("by_track_and_user", (q) =>
          q.eq("trackId", track._id).eq("userId", userId)
        )
        .first();

      if (!isCreator && !hasAccess) return null;
    }

    return track;
  },
});

/**
 * Update track privacy setting
 */
export const updatePrivacy = mutation({
  args: {
    trackId: v.id("tracks"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    if (track.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.trackId, {
      isPublic: args.isPublic,
    });
  },
});

/**
 * Get current user's tracks
 */
export const getMyTracks = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("tracks")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Grant a user access to a private track
 */
export const grantAccess = mutation({
  args: {
    trackId: v.id("tracks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const granterId = await getAuthUserId(ctx);
    if (!granterId) throw new Error("Not authenticated");

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");
    if (track.creatorId !== granterId) throw new Error("Not authorized");
    if (args.userId === granterId) throw new Error("Cannot grant access to yourself");

    // Check if already granted
    const existing = await ctx.db
      .query("trackAccess")
      .withIndex("by_track_and_user", (q) =>
        q.eq("trackId", args.trackId).eq("userId", args.userId)
      )
      .first();

    if (existing) return existing._id;

    return ctx.db.insert("trackAccess", {
      trackId: args.trackId,
      userId: args.userId,
      grantedBy: granterId,
      grantedAt: Date.now(),
    });
  },
});

/**
 * Revoke a user's access to a private track
 */
export const revokeAccess = mutation({
  args: {
    trackId: v.id("tracks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const revokerId = await getAuthUserId(ctx);
    if (!revokerId) throw new Error("Not authenticated");

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");
    if (track.creatorId !== revokerId) throw new Error("Not authorized");

    const access = await ctx.db
      .query("trackAccess")
      .withIndex("by_track_and_user", (q) =>
        q.eq("trackId", args.trackId).eq("userId", args.userId)
      )
      .first();

    if (access) {
      await ctx.db.delete(access._id);
    }
  },
});

/**
 * Get all collaborators for a track
 */
export const getCollaborators = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const track = await ctx.db.get(args.trackId);
    if (!track || track.creatorId !== userId) return [];

    const accessRecords = await ctx.db
      .query("trackAccess")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .collect();

    const collaborators = await Promise.all(
      accessRecords.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          _id: record._id,
          userId: record.userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          grantedAt: record.grantedAt,
        };
      })
    );

    return collaborators;
  },
});

/**
 * Get tracks shared with the current user
 */
export const getSharedWithMe = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const accessRecords = await ctx.db
      .query("trackAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const tracks = await Promise.all(
      accessRecords.map(async (record) => ctx.db.get(record.trackId))
    );

    return tracks.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

/**
 * Delete a track (and all its versions, comments)
 */
export const deleteTrack = mutation({
  args: {
    trackId: v.id("tracks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    if (track.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    // Delete track (versions and comments will need to be cleaned up separately)
    await ctx.db.delete(args.trackId);
  },
});
