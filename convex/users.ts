import { mutation, query } from "./_generated/server";
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

/**
 * Update the current user's display name.
 * Also propagates to denormalized creatorName on owned tracks.
 */
export const updateName = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trimmed = args.name.trim();
    if (trimmed.length === 0) throw new Error("Name cannot be empty");
    if (trimmed.length > 50) throw new Error("Name must be 50 characters or fewer");

    await ctx.db.patch(userId, { name: trimmed });

    // Update denormalized creatorName on all tracks owned by this user
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .collect();

    for (const track of tracks) {
      await ctx.db.patch(track._id, { creatorName: trimmed });
    }
  },
});

/**
 * Check if a username is available.
 */
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.username.toLowerCase().trim();
    if (!normalized) return false;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalized))
      .first();

    return existing === null;
  },
});

/**
 * Resolve a login identifier (username or email) to the actual email.
 * Used during login to support username-based login for accounts that have usernames.
 */
export const resolveLoginIdentifier = query({
  args: { identifier: v.string() },
  handler: async (ctx, { identifier }) => {
    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed) return null;

    // If it looks like an email, return it as-is
    if (trimmed.includes("@")) {
      return { email: trimmed };
    }

    // Otherwise, look up by username
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", trimmed))
      .first();

    if (!user || !user.email) {
      return null;
    }

    return { email: user.email };
  },
});
