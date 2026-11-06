import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Track access policy. The single place that decides what a viewer may do
 * with a track and everything under it (versions, comments, files).
 *
 * - owner: created the track; full control
 * - collaborator: granted access via trackAccess
 * - guest: anyone (signed in or not) viewing a public/unlisted track
 *
 * A viewer with no role cannot see the track at all. Private tracks only
 * have owners and collaborators, so "can view" implies "can comment".
 */
export type TrackRole = "owner" | "collaborator" | "guest";

/** What the caller needs: "view" (read + comment) or "own" (manage). */
export type TrackNeed = "view" | "own";

export interface TrackAccess {
  track: Doc<"tracks">;
  userId: Id<"users"> | null;
  role: TrackRole;
}

export interface VersionAccess extends TrackAccess {
  version: Doc<"versions">;
}

async function roleFor(
  ctx: QueryCtx,
  track: Doc<"tracks">,
  userId: Id<"users"> | null,
): Promise<TrackRole | null> {
  if (userId && track.creatorId === userId) return "owner";
  if (userId) {
    const grant = await ctx.db
      .query("trackAccess")
      .withIndex("by_track_and_user", (q) =>
        q.eq("trackId", track._id).eq("userId", userId),
      )
      .first();
    if (grant) return "collaborator";
  }
  return track.visibility === "private" ? null : "guest";
}

function satisfies(role: TrackRole, need: TrackNeed): boolean {
  return need === "view" || role === "owner";
}

/**
 * Resolve the viewer's access to a track. Returns null when the track does
 * not exist or the viewer lacks `need`, so queries can treat "missing" and
 * "forbidden" identically and never leak existence of private tracks.
 */
export async function readTrack(
  ctx: QueryCtx,
  trackOrId: Id<"tracks"> | Doc<"tracks">,
  need: TrackNeed = "view",
): Promise<TrackAccess | null> {
  const track =
    typeof trackOrId === "string" ? await ctx.db.get(trackOrId) : trackOrId;
  if (!track) return null;
  const userId = await getAuthUserId(ctx);
  const role = await roleFor(ctx, track, userId);
  if (!role || !satisfies(role, need)) return null;
  return { track, userId, role };
}

/** Like readTrack, but throws. For mutations and actions. */
export async function requireTrack(
  ctx: QueryCtx,
  trackId: Id<"tracks">,
  need: TrackNeed = "view",
): Promise<TrackAccess> {
  if (need === "own" && !(await getAuthUserId(ctx))) {
    throw new Error("Not authenticated");
  }
  const access = await readTrack(ctx, trackId, need);
  if (!access) throw new Error(need === "own" ? "Not authorized" : "Track not found");
  return access;
}

/** Resolve the viewer's access to a version via its track. */
export async function readVersion(
  ctx: QueryCtx,
  versionId: Id<"versions">,
  need: TrackNeed = "view",
): Promise<VersionAccess | null> {
  const version = await ctx.db.get(versionId);
  if (!version) return null;
  const access = await readTrack(ctx, version.trackId, need);
  return access && { ...access, version };
}

/** Like readVersion, but throws. */
export async function requireVersion(
  ctx: QueryCtx,
  versionId: Id<"versions">,
  need: TrackNeed = "view",
): Promise<VersionAccess> {
  const version = await ctx.db.get(versionId);
  if (!version) throw new Error("Version not found");
  const access = await requireTrack(ctx, version.trackId, need);
  return { ...access, version };
}

/** The signed-in user, or throw. */
export async function requireUserId(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
