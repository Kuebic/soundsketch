import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the currently authenticated user.
 * Returns null if not authenticated, undefined while loading.
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
    };
  },
});

/**
 * Search for a user by exact email match
 */
export const searchByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const email = args.email.toLowerCase().trim();
    if (!email) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      name: user.name ?? "Unknown",
      email: user.email,
    };
  },
});

/**
 * Get all participants for a track (creator + collaborators).
 * Used for @mention autocomplete in comments.
 */
export const getTrackParticipants = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) return [];

    const participants: Array<{ _id: string; name: string }> = [];

    // Add track creator
    const creator = await ctx.db.get(track.creatorId);
    if (creator) {
      participants.push({ _id: creator._id, name: creator.name ?? "Unknown" });
    }

    // Add all users with access
    const accessRecords = await ctx.db
      .query("trackAccess")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .collect();

    for (const record of accessRecords) {
      const user = await ctx.db.get(record.userId);
      if (user) {
        participants.push({ _id: user._id, name: user.name ?? "Unknown" });
      }
    }

    return participants;
  },
});
