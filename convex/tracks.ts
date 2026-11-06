import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readTrack, requireTrack, requireUserId } from "./lib/access";
import { cascadeDelete } from "./lib/cascade";
import { randomId } from "./lib/storageKeys";

const visibility = v.union(v.literal("public"), v.literal("unlisted"), v.literal("private"));

function cleanTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title cannot be empty");
  if (trimmed.length > 200) throw new Error("Title must be 200 characters or fewer");
  return trimmed;
}

/**
 * Create a new track (versions are added separately)
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    visibility: v.optional(visibility),
    downloadsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const shareableId = randomId(10);
    const trackId = await ctx.db.insert("tracks", {
      title: cleanTitle(args.title),
      description: args.description?.trim() || undefined,
      creatorId: user._id,
      creatorName: user.name ?? "Unknown",
      visibility: args.visibility ?? "unlisted",
      shareableId,
      downloadsEnabled: args.downloadsEnabled ?? false,
    });

    return { trackId, shareableId };
  },
});

/**
 * Search public tracks by title or creator name.
 * Falls back to the latest public tracks when searchText is empty.
 */
export const searchPublicTracks = query({
  args: {
    searchText: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.searchText.trim();

    if (!trimmed) {
      return ctx.db
        .query("tracks")
        .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
        .order("desc")
        .take(50);
    }

    const [titleResults, creatorResults] = await Promise.all([
      ctx.db
        .query("tracks")
        .withSearchIndex("search_title", (q) =>
          q.search("title", trimmed).eq("visibility", "public")
        )
        .take(25),
      ctx.db
        .query("tracks")
        .withSearchIndex("search_creator", (q) =>
          q.search("creatorName", trimmed).eq("visibility", "public")
        )
        .take(25),
    ]);

    // Deduplicate by _id, title matches take priority
    const seen = new Set<string>();
    const merged = [];
    for (const track of [...titleResults, ...creatorResults]) {
      if (!seen.has(track._id)) {
        seen.add(track._id);
        merged.push(track);
      }
    }

    return merged;
  },
});

/**
 * Get track by shareable ID, with the viewer's role on it.
 * Returns null if the track doesn't exist or the viewer can't see it.
 */
export const getByShareableId = query({
  args: { shareableId: v.string() },
  handler: async (ctx, args) => {
    const track = await ctx.db
      .query("tracks")
      .withIndex("by_shareable_id", (q) => q.eq("shareableId", args.shareableId))
      .first();
    if (!track) return null;

    const access = await readTrack(ctx, track);
    return access && { ...access.track, viewerRole: access.role };
  },
});

/**
 * Update owner-controlled track settings. Omitted fields are left unchanged.
 */
export const updateSettings = mutation({
  args: {
    trackId: v.id("tracks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(visibility),
    downloadsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, { trackId, ...settings }) => {
    await requireTrack(ctx, trackId, "own");
    await ctx.db.patch(trackId, {
      ...(settings.title !== undefined && { title: cleanTitle(settings.title) }),
      ...(settings.description !== undefined && {
        description: settings.description.trim() || undefined,
      }),
      ...(settings.visibility !== undefined && { visibility: settings.visibility }),
      ...(settings.downloadsEnabled !== undefined && {
        downloadsEnabled: settings.downloadsEnabled,
      }),
    });
  },
});

/**
 * Get current user's tracks
 */
export const getMyTracks = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("tracks")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Grant a user access to a track
 */
export const grantAccess = mutation({
  args: {
    trackId: v.id("tracks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId: granterId } = await requireTrack(ctx, args.trackId, "own");
    if (args.userId === granterId) throw new Error("Cannot grant access to yourself");
    if (!(await ctx.db.get(args.userId))) throw new Error("User not found");

    const existing = await ctx.db
      .query("trackAccess")
      .withIndex("by_track_and_user", (q) =>
        q.eq("trackId", args.trackId).eq("userId", args.userId)
      )
      .first();
    if (existing) return existing._id;

    return ctx.db.insert("trackAccess", {
      trackId: args.trackId,
      userId: args.userId,
      grantedBy: granterId!,
      grantedAt: Date.now(),
    });
  },
});

/**
 * Revoke a user's access to a track
 */
export const revokeAccess = mutation({
  args: {
    trackId: v.id("tracks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireTrack(ctx, args.trackId, "own");

    const access = await ctx.db
      .query("trackAccess")
      .withIndex("by_track_and_user", (q) =>
        q.eq("trackId", args.trackId).eq("userId", args.userId)
      )
      .first();

    if (access) {
      await ctx.db.delete(access._id);
    }
  },
});

/**
 * Get all collaborators for a track (owner only)
 */
export const getCollaborators = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    if (!(await readTrack(ctx, args.trackId, "own"))) return [];

    const accessRecords = await ctx.db
      .query("trackAccess")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .collect();

    return Promise.all(
      accessRecords.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          _id: record._id,
          userId: record.userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          grantedAt: record.grantedAt,
        };
      })
    );
  },
});

/**
 * Get tracks shared with the current user
 */
export const getSharedWithMe = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const accessRecords = await ctx.db
      .query("trackAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const tracks = await Promise.all(
      accessRecords.map(async (record) => ctx.db.get(record.trackId))
    );

    return tracks.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

/**
 * Delete a track with all its versions, comments, grants and files
 */
export const deleteTrack = mutation({
  args: {
    trackId: v.id("tracks"),
  },
  handler: async (ctx, args) => {
    await requireTrack(ctx, args.trackId, "own");
    await cascadeDelete(ctx, [{ kind: "track", id: args.trackId }]);
  },
});
