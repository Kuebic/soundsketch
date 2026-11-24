import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readPlaylist, requireUserId } from "./lib/access";
import { randomId } from "./lib/storageKeys";

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
 * The signed-in user's playlists, newest first.
 */
export const getMyPlaylists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("playlists")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .collect();
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
    return {
      _id: playlist._id,
      title: playlist.title,
      description: playlist.description,
      creatorName: playlist.creatorName,
      shareableId: playlist.shareableId,
      viewerRole: role,
    };
  },
});
