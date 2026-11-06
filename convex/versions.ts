import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./lib/rateLimit";
import { readTrack, requireTrack, requireVersion } from "./lib/access";
import { cascadeDelete } from "./lib/cascade";
import { isVersionKeyFor } from "./lib/storageKeys";

/**
 * Register an uploaded version. The client first uploads to URLs from
 * r2.getVersionUploadUrls, then passes the returned keys here.
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
    const { userId } = await requireTrack(ctx, args.trackId, "own");

    const keys = [args.r2Key, args.originalR2Key].filter((k): k is string => !!k);
    if (!keys.every((key) => isVersionKeyFor(args.trackId, key))) {
      throw new Error("Invalid file key");
    }
    const versionName = args.versionName.trim();
    if (!versionName) throw new Error("Version name cannot be empty");

    // Rate limit: 5 uploads per hour
    await checkRateLimit(ctx, `upload:${userId}`, 5, 3_600_000);

    const versionId = await ctx.db.insert("versions", {
      ...args,
      versionName,
      changeNotes: args.changeNotes?.trim() || undefined,
      r2Bucket: process.env.R2_BUCKET_NAME || "soundsketch-files",
      uploadedBy: userId!,
    });

    await ctx.db.patch(args.trackId, { latestVersionId: versionId });
    return versionId;
  },
});

/**
 * All versions of a track, newest first. Empty if the viewer can't see the track.
 */
export const getByTrack = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    if (!(await readTrack(ctx, args.trackId))) return [];

    const versions = await ctx.db
      .query("versions")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .order("desc")
      .collect();
    // Storage keys stay server-side; files are reached through r2.* by versionId.
    return versions.map(({ r2Key: _r2Key, originalR2Key, r2Bucket: _r2Bucket, ...version }) => ({
      ...version,
      hasOriginal: !!originalR2Key,
    }));
  },
});

/**
 * Delete a version with its comments and files
 */
export const deleteVersion = mutation({
  args: {
    versionId: v.id("versions"),
  },
  handler: async (ctx, args) => {
    await requireVersion(ctx, args.versionId, "own");
    await cascadeDelete(ctx, [{ kind: "version", id: args.versionId }]);
  },
});
