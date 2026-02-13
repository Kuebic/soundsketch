import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nanoid } from "nanoid";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const shareableId = nanoid(10); // Short unique ID for URLs

    // Create track without latestVersionId initially
    const trackId = await ctx.db.insert("tracks", {
      title: args.title,
      description: args.description,
      creatorId: user._id,
      creatorName: user.name,
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
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;

      const user = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .first();

      if (!user) return null;

      // Check if user is creator or has explicit access
      const isCreator = track.creatorId === user._id;
      const hasAccess = await ctx.db
        .query("trackAccess")
        .withIndex("by_track_and_user", (q) =>
          q.eq("trackId", track._id).eq("userId", user._id)
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (track.creatorId !== user?._id) {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    return ctx.db
      .query("tracks")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .order("desc")
      .collect();
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (track.creatorId !== user?._id) {
      throw new Error("Not authorized");
    }

    // Delete track (versions and comments will need to be cleaned up separately)
    await ctx.db.delete(args.trackId);
  },
});
