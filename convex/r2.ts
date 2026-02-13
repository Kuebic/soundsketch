import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateUploadUrl, generateDownloadUrl } from "./lib/r2Client";
import { nanoid } from "nanoid";

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "soundsketch-files";

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
    const uniqueId = nanoid();
    const extension = args.fileName.split('.').pop();
    const r2Key = `tracks/${args.trackId || uniqueId}/${uniqueId}.${extension}`;

    const uploadUrl = await generateUploadUrl(r2Key, BUCKET_NAME);

    return { uploadUrl, r2Key };
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
 * Generate presigned URL for uploading a comment attachment to R2
 */
export const getAttachmentUploadUrl = action({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    commentId: v.string(), // will become ID after comment creation
  },
  handler: async (_ctx, args): Promise<{ uploadUrl: string; r2Key: string }> => {
    const uniqueId = nanoid();
    const extension = args.fileName.split('.').pop();
    const r2Key = `attachments/${args.commentId}/${uniqueId}.${extension}`;

    const uploadUrl = await generateUploadUrl(r2Key, BUCKET_NAME);

    return { uploadUrl, r2Key };
  },
});
