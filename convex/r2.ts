"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { generateUploadUrl, generateDownloadUrl, deleteObjects as deleteR2Objects } from "./lib/r2Client";
import { internal } from "./_generated/api";

/**
 * Signed-URL half of the storage module. Callers name a Version or Comment;
 * convex/storage.ts checks access and resolves the R2 key.
 *
 * Expiry: PUT URLs last 5 minutes, GET URLs 1 hour.
 */

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "soundsketch-files";

/** Signed URL for streaming a version in the player. */
export const getVersionStreamUrl = action({
  args: { versionId: v.id("versions") },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const r2Key = await ctx.runQuery(internal.storage.versionStreamKey, args);
    return { url: await generateDownloadUrl(r2Key, BUCKET_NAME) };
  },
});

/** Signed URL for downloading a version's original file. */
export const getVersionDownloadUrl = action({
  args: { versionId: v.id("versions") },
  handler: async (ctx, args): Promise<{ url: string; fileName: string }> => {
    const { r2Key, fileName } = await ctx.runQuery(internal.storage.versionDownloadKey, args);
    return { url: await generateDownloadUrl(r2Key, BUCKET_NAME), fileName };
  },
});

/** Signed URL for a comment attachment. */
export const getAttachmentUrl = action({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const r2Key = await ctx.runQuery(internal.storage.attachmentDownloadKey, args);
    return { url: await generateDownloadUrl(r2Key, BUCKET_NAME) };
  },
});

/**
 * Upload URLs for a new version: the streaming file always, plus the
 * original when a lossless file is converted to MP3 in the browser.
 */
export const getVersionUploadUrls = action({
  args: {
    trackId: v.id("tracks"),
    fileName: v.string(),
    needsConversion: v.boolean(),
  },
  handler: async (ctx, args): Promise<{
    streaming: { url: string; r2Key: string };
    original?: { url: string; r2Key: string };
  }> => {
    const { streamingKey, originalKey } = await ctx.runQuery(internal.storage.newVersionKeys, args);
    return {
      streaming: { url: await generateUploadUrl(streamingKey, BUCKET_NAME), r2Key: streamingKey },
      original: originalKey
        ? { url: await generateUploadUrl(originalKey, BUCKET_NAME), r2Key: originalKey }
        : undefined,
    };
  },
});

/** Upload URL for a comment attachment. */
export const getAttachmentUploadUrl = action({
  args: {
    trackId: v.id("tracks"),
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string; r2Key: string }> => {
    const r2Key = await ctx.runQuery(internal.storage.newAttachmentKey, args);
    return { url: await generateUploadUrl(r2Key, BUCKET_NAME), r2Key };
  },
});

/** Delete objects from R2. Scheduled by lib/cascade only. */
export const deleteObjects = internalAction({
  args: { r2Keys: v.array(v.string()) },
  handler: async (_ctx, args): Promise<void> => {
    await deleteR2Objects(args.r2Keys, BUCKET_NAME);
  },
});
