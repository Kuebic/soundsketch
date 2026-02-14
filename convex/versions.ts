import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkRateLimit } from "./lib/rateLimit";

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
    // Original lossless file (only set when WAV/FLAC was converted to MP3)
    originalR2Key: v.optional(v.string()),
    originalFileName: v.optional(v.string()),
    originalFileSize: v.optional(v.number()),
    originalFileFormat: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const track = await ctx.db.get(args.trackId);
    if (!track) throw new Error("Track not found");

    if (track.creatorId !== userId) {
      throw new Error("Not authorized");
    }

    // Rate limit: 5 uploads per hour
    await checkRateLimit(ctx, `upload:${userId}`, 5, 3_600_000);

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
      uploadedBy: userId,
      // Original file fields (only set for converted lossless files)
      originalR2Key: args.originalR2Key,
      originalFileName: args.originalFileName,
      originalFileSize: args.originalFileSize,
      originalFileFormat: args.originalFileFormat,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const version = await ctx.db.get(args.versionId);
    if (!version) throw new Error("Version not found");

    const track = await ctx.db.get(version.trackId);
    if (!track) throw new Error("Track not found");

    if (track.creatorId !== userId) {
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
