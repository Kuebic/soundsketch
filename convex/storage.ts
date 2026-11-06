import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { readVersion, requireTrack } from "./lib/access";
import { attachmentKey, versionKeys } from "./lib/storageKeys";

/**
 * Authorization half of the storage module. The actions in r2.ts (Node
 * runtime, no db access) call these to turn a Version/Comment id into an R2
 * key the caller is allowed to touch. Clients never see or send raw keys
 * except the fresh upload keys these functions mint.
 */

/** Streaming file of a version the viewer can see. */
export const versionStreamKey = internalQuery({
  args: { versionId: v.id("versions") },
  handler: async (ctx, args) => {
    const access = await readVersion(ctx, args.versionId);
    if (!access) throw new Error("Version not found");
    return access.version.r2Key;
  },
});

/** Original (lossless, if any) file of a version, when downloads are allowed. */
export const versionDownloadKey = internalQuery({
  args: { versionId: v.id("versions") },
  handler: async (ctx, args) => {
    const access = await readVersion(ctx, args.versionId);
    if (!access) throw new Error("Version not found");
    if (!access.track.downloadsEnabled && access.role !== "owner") {
      throw new Error("Downloads are not enabled for this track");
    }
    const { version } = access;
    return {
      r2Key: version.originalR2Key ?? version.r2Key,
      fileName: version.originalFileName ?? version.fileName,
    };
  },
});

/** Attachment of a comment on a track the viewer can see. */
export const attachmentDownloadKey = internalQuery({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment?.attachmentR2Key) throw new Error("Attachment not found");
    await requireTrack(ctx, comment.trackId);
    return comment.attachmentR2Key;
  },
});

/** Mint keys for a new version upload. Owner only. */
export const newVersionKeys = internalQuery({
  args: {
    trackId: v.id("tracks"),
    fileName: v.string(),
    needsConversion: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireTrack(ctx, args.trackId, "own");
    return versionKeys(args.trackId, args.fileName, args.needsConversion);
  },
});

/** Mint a key for a comment attachment. Anyone who can comment on the track. */
export const newAttachmentKey = internalQuery({
  args: {
    trackId: v.id("tracks"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTrack(ctx, args.trackId);
    return attachmentKey(args.trackId, args.fileName);
  },
});
