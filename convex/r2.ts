"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateUploadUrl, generateDownloadUrl, deleteObjects } from "./lib/r2Client";
import { api } from "./_generated/api";

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "soundsketch-files";

/** Generate a unique ID safe for the Convex runtime (no ESM-only deps). */
function generateUniqueId(length = 21): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Generate presigned URL for uploading a track file to R2
 */
export const getTrackUploadUrl = action({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    trackId: v.optional(v.id("tracks")),
    versionName: v.string(),
  },
  handler: async (_ctx, args): Promise<{ uploadUrl: string; r2Key: string }> => {
    // Generate unique R2 key to prevent collisions
    const uniqueId = generateUniqueId();
    const extension = args.fileName.split('.').pop();
    const r2Key = `tracks/${args.trackId || uniqueId}/${uniqueId}.${extension}`;

    const uploadUrl = await generateUploadUrl(r2Key, BUCKET_NAME);

    return { uploadUrl, r2Key };
  },
});

/**
 * Generate presigned URLs for uploading track files (streaming + original for lossless)
 */
export const getTrackUploadUrls = action({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    trackId: v.optional(v.id("tracks")),
    versionName: v.string(),
    needsConversion: v.boolean(), // true for lossless (WAV, FLAC)
  },
  handler: async (_ctx, args): Promise<{
    streamingUploadUrl: string;
    streamingR2Key: string;
    originalUploadUrl?: string;
    originalR2Key?: string;
  }> => {
    const uniqueId = generateUniqueId();
    const basePath = `tracks/${args.trackId || uniqueId}`;
    const originalExtension = args.fileName.split('.').pop()?.toLowerCase();

    // Streaming file (MP3 for converted, original extension for already-lossy)
    const streamingExtension = args.needsConversion ? 'mp3' : originalExtension;
    const streamingR2Key = `${basePath}/${uniqueId}-stream.${streamingExtension}`;
    const streamingUploadUrl = await generateUploadUrl(streamingR2Key, BUCKET_NAME);

    // Original file (only for lossless that needs conversion)
    let originalUploadUrl: string | undefined;
    let originalR2Key: string | undefined;

    if (args.needsConversion) {
      originalR2Key = `${basePath}/${uniqueId}-original.${originalExtension}`;
      originalUploadUrl = await generateUploadUrl(originalR2Key, BUCKET_NAME);
    }

    return {
      streamingUploadUrl,
      streamingR2Key,
      originalUploadUrl,
      originalR2Key,
    };
  },
});

/**
 * Generate presigned URL for downloading a track file from R2
 */
export const getTrackDownloadUrl = action({
  args: {
    r2Key: v.string(),
  },
  handler: async (_ctx, args): Promise<{ downloadUrl: string }> => {
    const downloadUrl = await generateDownloadUrl(args.r2Key, BUCKET_NAME);
    return { downloadUrl };
  },
});

/**
 * Generate presigned URL for downloading the original file (for lossless tracks)
 * Checks if downloads are enabled on the track before returning URL
 */
export const getOriginalDownloadUrl = action({
  args: {
    versionId: v.id("versions"),
  },
  handler: async (ctx, args): Promise<{ downloadUrl: string; fileName: string }> => {
    // Get version data
    const version = await ctx.runQuery(api.versions.getById, { versionId: args.versionId });
    if (!version) {
      throw new Error("Version not found");
    }

    // Get track to check if downloads are enabled
    const track = await ctx.runQuery(api.tracks.getById, { trackId: version.trackId });
    if (!track) {
      throw new Error("Track not found");
    }

    if (!track.downloadsEnabled) {
      throw new Error("Downloads are not enabled for this track");
    }

    // Use original file if available, otherwise streaming file
    const r2Key = version.originalR2Key || version.r2Key;
    const fileName = version.originalFileName || version.fileName;

    const downloadUrl = await generateDownloadUrl(r2Key, BUCKET_NAME);

    return { downloadUrl, fileName };
  },
});

/**
 * Generate presigned URL for downloading a comment attachment from R2
 */
export const getAttachmentDownloadUrl = action({
  args: {
    r2Key: v.string(),
  },
  handler: async (_ctx, args): Promise<{ downloadUrl: string }> => {
    const downloadUrl = await generateDownloadUrl(args.r2Key, BUCKET_NAME);
    return { downloadUrl };
  },
});

/**
 * Generate presigned URL for uploading a comment attachment to R2
 */
export const getAttachmentUploadUrl = action({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    commentId: v.string(), // will become ID after comment creation
  },
  handler: async (_ctx, args): Promise<{ uploadUrl: string; r2Key: string }> => {
    const uniqueId = generateUniqueId();
    const extension = args.fileName.split('.').pop();
    const r2Key = `attachments/${args.commentId}/${uniqueId}.${extension}`;

    const uploadUrl = await generateUploadUrl(r2Key, BUCKET_NAME);

    return { uploadUrl, r2Key };
  },
});

/**
 * Delete multiple objects from R2
 * Used for cleanup when deleting tracks, versions, or accounts
 */
export const deleteR2Objects = action({
  args: {
    r2Keys: v.array(v.string()),
  },
  handler: async (_ctx, args): Promise<void> => {
    if (args.r2Keys.length === 0) return;
    await deleteObjects(args.r2Keys, BUCKET_NAME);
  },
});
