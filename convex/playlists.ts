import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readPlaylist, readTrack, requirePlaylist, requireTrack, requireUserId } from "./lib/access";
import { cascadeDelete } from "./lib/cascade";
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
 * The owner also gets `privateTracks`, to warn them before they send the link.
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
    // For the playlist owner only: the private tracks among those they can
    // see, which most recipients will not hear.
    const privateTracks = [];
    for (const entry of await entriesOf(ctx, playlist._id)) {
      const trackAccess = await readTrack(ctx, entry.trackId);
      if (!trackAccess) {
        hiddenCount++;
        continue;
      }
      const { track } = trackAccess;
      if (track.visibility === "private") {
        privateTracks.push({
          trackId: track._id,
          title: track.title,
          creatorName: track.creatorName,
          canMakeUnlisted: trackAccess.role === "owner",
        });
      }
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
      ...(role === "owner" && { privateTracks }),
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
      // Coded: the picker tells these apart, and plain messages are redacted in production.
      throw new ConvexError({
        code: "already_in_playlist" as const,
        message: "Track is already in this playlist",
      });
    }
    if (entries.length >= MAX_TRACKS) {
      throw new ConvexError({
        code: "playlist_full" as const,
        message: `A playlist can hold at most ${MAX_TRACKS} tracks`,
      });
    }

    const last = entries[entries.length - 1];
    await ctx.db.insert("playlistTracks", {
      playlistId: args.playlistId,
      trackId: args.trackId,
      position: last ? last.position + 1 : 0,
    });
  },
});

/**
 * Update a playlist's title and description. Omitted fields are left unchanged.
 */
export const update = mutation({
  args: {
    playlistId: v.id("playlists"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { playlistId, ...fields }) => {
    await requirePlaylist(ctx, playlistId, "own");
    await ctx.db.patch(playlistId, {
      ...(fields.title !== undefined && { title: cleanTitle(fields.title) }),
      ...(fields.description !== undefined && {
        description: fields.description.trim() || undefined,
      }),
    });
  },
});

/**
 * Move a track one place up or down by swapping it with its neighbour.
 * The neighbour is the nearest entry the owner can see, so a move always
 * changes the order on their page. Does nothing at the ends of the list.
 */
export const moveTrack = mutation({
  args: {
    playlistId: v.id("playlists"),
    trackId: v.id("tracks"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await requirePlaylist(ctx, args.playlistId, "own");

    const entries = await entriesOf(ctx, args.playlistId);
    const from = entries.findIndex((entry) => entry.trackId === args.trackId);
    if (from === -1) throw new Error("Track is not in this playlist");

    const step = args.direction === "up" ? -1 : 1;
    for (let i = from + step; i >= 0 && i < entries.length; i += step) {
      if (!(await readTrack(ctx, entries[i].trackId))) continue;
      await ctx.db.patch(entries[from]._id, { position: entries[i].position });
      await ctx.db.patch(entries[i]._id, { position: entries[from].position });
      return;
    }
  },
});

/**
 * Take a track out of a playlist. The track itself is untouched.
 */
export const removeTrack = mutation({
  args: {
    playlistId: v.id("playlists"),
    trackId: v.id("tracks"),
  },
  handler: async (ctx, args) => {
    await requirePlaylist(ctx, args.playlistId, "own");
    const entries = await entriesOf(ctx, args.playlistId);
    for (const entry of entries) {
      if (entry.trackId === args.trackId) await ctx.db.delete(entry._id);
    }
  },
});

/**
 * Delete a playlist and its entries. Its tracks are untouched.
 */
export const deletePlaylist = mutation({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, args) => {
    await requirePlaylist(ctx, args.playlistId, "own");
    await cascadeDelete(ctx, [{ kind: "playlist", id: args.playlistId }]);
  },
});
