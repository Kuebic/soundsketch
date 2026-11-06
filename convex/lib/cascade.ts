import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Ownership tree, and the only code that deletes from it:
 *
 *   user ─┬─ track ─┬─ version ── comment ── reply
 *         │         └─ trackAccess
 *         └─ auth sessions / accounts
 *
 * Deleting a node deletes everything under it and schedules removal of every
 * R2 object those rows referenced. Callers must check authorization first.
 */
export type CascadeTarget =
  | { kind: "track"; id: Id<"tracks"> }
  | { kind: "version"; id: Id<"versions"> }
  | { kind: "comment"; id: Id<"comments"> };

export async function cascadeDelete(
  ctx: MutationCtx,
  targets: CascadeTarget[],
): Promise<void> {
  const keys: string[] = [];
  for (const target of targets) {
    if (target.kind === "track") await deleteTrack(ctx, target.id, keys);
    if (target.kind === "version") await deleteVersion(ctx, target.id, keys);
    if (target.kind === "comment") await deleteComment(ctx, target.id, keys);
  }
  await purgeObjects(ctx, keys);
}

/** Delete a user's auth records (sessions, refresh tokens, accounts). */
export async function deleteAuthRecords(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  for (const session of sessions) {
    const tokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const token of tokens) await ctx.db.delete(token._id);
    await ctx.db.delete(session._id);
  }
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .collect();
  for (const account of accounts) await ctx.db.delete(account._id);
}

async function deleteTrack(ctx: MutationCtx, trackId: Id<"tracks">, keys: string[]) {
  const track = await ctx.db.get(trackId);
  if (!track) return;

  const versions = await ctx.db
    .query("versions")
    .withIndex("by_track", (q) => q.eq("trackId", trackId))
    .collect();
  for (const version of versions) await deleteVersionRows(ctx, version, keys);

  // Comments are indexed by version, but sweep by track to catch any whose
  // version row is already gone.
  const leftovers = await ctx.db
    .query("comments")
    .withIndex("by_track", (q) => q.eq("trackId", trackId))
    .collect();
  for (const comment of leftovers) await deleteCommentRows(ctx, comment, keys);

  const grants = await ctx.db
    .query("trackAccess")
    .withIndex("by_track", (q) => q.eq("trackId", trackId))
    .collect();
  for (const grant of grants) await ctx.db.delete(grant._id);

  await ctx.db.delete(trackId);
}

async function deleteVersion(ctx: MutationCtx, versionId: Id<"versions">, keys: string[]) {
  const version = await ctx.db.get(versionId);
  if (!version) return;
  await deleteVersionRows(ctx, version, keys);

  // Keep the track's latestVersionId pointing at a live version.
  const track = await ctx.db.get(version.trackId);
  if (track?.latestVersionId === versionId) {
    const next = await ctx.db
      .query("versions")
      .withIndex("by_track", (q) => q.eq("trackId", version.trackId))
      .order("desc")
      .first();
    await ctx.db.patch(track._id, { latestVersionId: next?._id });
  }
}

async function deleteVersionRows(ctx: MutationCtx, version: Doc<"versions">, keys: string[]) {
  keys.push(version.r2Key);
  if (version.originalR2Key) keys.push(version.originalR2Key);

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_version", (q) => q.eq("versionId", version._id))
    .collect();
  for (const comment of comments) await deleteCommentRows(ctx, comment, keys);

  await ctx.db.delete(version._id);
}

async function deleteComment(ctx: MutationCtx, commentId: Id<"comments">, keys: string[]) {
  const comment = await ctx.db.get(commentId);
  if (comment) await deleteCommentRows(ctx, comment, keys);
}

async function deleteCommentRows(ctx: MutationCtx, comment: Doc<"comments">, keys: string[]) {
  // A sibling sweep may already have removed this row.
  if (!(await ctx.db.get(comment._id))) return;

  const replies = await ctx.db
    .query("comments")
    .withIndex("by_parent", (q) => q.eq("parentCommentId", comment._id))
    .collect();
  for (const reply of replies) await deleteCommentRows(ctx, reply, keys);

  if (comment.attachmentR2Key) keys.push(comment.attachmentR2Key);
  await ctx.db.delete(comment._id);
}

async function purgeObjects(ctx: MutationCtx, keys: string[]) {
  const unique = [...new Set(keys)];
  // R2 DeleteObjects accepts at most 1000 keys per request.
  for (let i = 0; i < unique.length; i += 1000) {
    await ctx.scheduler.runAfter(0, internal.r2.deleteObjects, {
      r2Keys: unique.slice(i, i + 1000),
    });
  }
}
