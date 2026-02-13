import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new version for a track
 */
export const create = mutation({
  args: {
    trackId: v.id("tracks"),
    versionName: v.string(),
    changeNotes: v.optional(v.string()),
    r2Key: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    fileFormat: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) throw new Error("User not found");

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    if (track.creatorId !== user._id) {
      throw new Error("Not authorized");
    }

    const versionId = await ctx.db.insert("versions", {
      trackId: args.trackId,
      versionName: args.versionName,
      changeNotes: args.changeNotes,
      r2Key: args.r2Key,
      r2Bucket: process.env.R2_BUCKET_NAME || "soundsketch-files",
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileFormat: args.fileFormat,
      duration: args.duration,
      uploadedBy: user._id,
    });

    // Update track's latest version
    await ctx.db.patch(args.trackId, {
      latestVersionId: versionId,
    });

    return versionId;
  },
});

/**
 * Get all versions for a track
 */
export const getByTrack = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("versions")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single version by ID
 */
export const getById = query({
  args: { versionId: v.id("versions") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.versionId);
  },
});

/**
 * Delete a version
 */
export const deleteVersion = mutation({
  args: {
    versionId: v.id("versions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("Version not found");

    const track = await ctx.db.get(version.trackId);
    if (!track) throw new Error("Track not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (track.creatorId !== user?._id) {
      throw new Error("Not authorized");
    }

    // Delete version
    await ctx.db.delete(args.versionId);

    // If this was the latest version, update track to use previous version
    if (track.latestVersionId === args.versionId) {
      const remainingVersions = await ctx.db
        .query("versions")
        .withIndex("by_track", (q) => q.eq("trackId", version.trackId))
        .order("desc")
        .take(1);

      if (remainingVersions.length > 0) {
        await ctx.db.patch(track._id, {
          latestVersionId: remainingVersions[0]._id,
        });
      }
    }
  },
});
