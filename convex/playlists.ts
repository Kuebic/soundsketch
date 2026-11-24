import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readPlaylist, readTrack, requirePlaylist, requireTrack, requireUserId } from "./lib/access";
import { randomId } from "./lib/storageKeys";

const MAX_TRACKS = 100;

/** A playlist's entries in listening order. */
function entriesOf(ctx: QueryCtx, playlistId: Id<"playlists">) {
  return ctx.db
    .query("playlistTracks")
    .withIndex("by_playlist", (q) => q.eq("playlistId", playlistId))
    .collect();
}

function cleanTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title cannot be empty");
  if (trimmed.length > 200) throw new Error("Title must be 200 characters or fewer");
  return trimmed;
}

/**
 * Create an empty playlist owned by the signed-in user.
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const shareableId = randomId(10);
    const playlistId = await ctx.db.insert("playlists", {
      title: cleanTitle(args.title),
      description: args.description?.trim() || undefined,
      creatorId: user._id,
      creatorName: user.name ?? "Unknown",
      shareableId,
    });

    return { playlistId, shareableId };
  },
});

/**
 * The signed-in user's playlists, newest first, with how many tracks each holds.
 */
export const getMyPlaylists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const playlists = await ctx.db
      .query("playlists")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      playlists.map(async (playlist) => ({
        ...playlist,
        trackCount: (await entriesOf(ctx, playlist._id)).length,
      })),
    );
  },
});

/**
 * Get a playlist by shareable ID, with the viewer's role on it.
 * Anyone holding the link may open it. Returns null if it doesn't exist.
 */
export const getByShareableId = query({
  args: { shareableId: v.string() },
  handler: async (ctx, args) => {
    const found = await ctx.db
      .query("playlists")
      .withIndex("by_shareable_id", (q) => q.eq("shareableId", args.shareableId))
      .first();
    if (!found) return null;

    const access = await readPlaylist(ctx, found);
    if (!access) return null;
    const { playlist, role } = access;

    // The link grants nothing on the tracks (ADR 0003): each one is resolved
    // for this viewer, and those they have no role on are only counted.
    const tracks = [];
    let hiddenCount = 0;
    for (const entry of await entriesOf(ctx, playlist._id)) {
      const trackAccess = await readTrack(ctx, entry.trackId);
      if (!trackAccess) {
        hiddenCount++;
        continue;
      }
      const { track } = trackAccess;
      const latest = track.latestVersionId && (await ctx.db.get(track.latestVersionId));
      tracks.push({ ...track, duration: latest ? latest.duration : null });
    }

    return {
      _id: playlist._id,
      title: playlist.title,
      description: playlist.description,
      creatorName: playlist.creatorName,
      shareableId: playlist.shareableId,
      viewerRole: role,
      tracks,
      hiddenCount,
    };
  },
});

/**
 * Append a track to the end of a playlist. The caller must own the playlist
 * and be able to view the track.
 */
export const addTrack = mutation({
  args: {
    playlistId: v.id("playlists"),
    trackId: v.id("tracks"),
  },
  handler: async (ctx, args) => {
    await requirePlaylist(ctx, args.playlistId, "own");
    await requireTrack(ctx, args.trackId);

    const entries = await entriesOf(ctx, args.playlistId);
    if (entries.some((entry) => entry.trackId === args.trackId)) {
      throw new Error("Track is already in this playlist");
    }
    if (entries.length >= MAX_TRACKS) {
      throw new Error(`A playlist can hold at most ${MAX_TRACKS} tracks`);
    }

    const last = entries[entries.length - 1];
    await ctx.db.insert("playlistTracks", {
      playlistId: args.playlistId,
      trackId: args.trackId,
      position: last ? last.position + 1 : 0,
    });
  },
});
