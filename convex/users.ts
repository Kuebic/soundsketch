import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import {
  getAuthUserId,
  retrieveAccount,
  modifyAccountCredentials,
  invalidateSessions,
  getAuthSessionId,
} from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { readTrack, requireUserId } from "./lib/access";
import { cascadeDelete, deleteAuthRecords, type CascadeTarget } from "./lib/cascade";

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
    const access = await readTrack(ctx, args.trackId);
    if (!access) return [];

    const accessRecords = await ctx.db
      .query("trackAccess")
      .withIndex("by_track", (q) => q.eq("trackId", args.trackId))
      .collect();

    const users = await Promise.all(
      [access.track.creatorId, ...accessRecords.map((r) => r.userId)].map((id) => ctx.db.get(id)),
    );
    return users
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => ({ _id: u._id, name: u.name ?? "Unknown" }));
  },
});

/**
 * Update the current user's display name.
 * Also propagates to denormalized creatorName/authorName on tracks and comments.
 */
export const updateName = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

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

    // ...and denormalized authorName on their comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    for (const comment of comments) {
      await ctx.db.patch(comment._id, { authorName: trimmed });
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

/**
 * Update the current user's email.
 */
export const updateEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const trimmed = args.email.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error("Invalid email format");
    }

    // Check if email is already taken by another user
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", trimmed))
      .first();

    if (existing && existing._id !== userId) {
      throw new Error("Email is already in use");
    }

    await ctx.db.patch(userId, { email: trimmed });
  },
});

/**
 * Delete the current user's account and associated data.
 * Owned tracks are always deleted with everything under them. Comments on
 * other people's tracks are anonymized ("keep_comments") or deleted with
 * their replies ("delete_everything").
 */
export const deleteAccount = mutation({
  args: {
    deletionMode: v.union(v.literal("keep_comments"), v.literal("delete_everything")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const ownTracks = await ctx.db
      .query("tracks")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .collect();
    const ownTrackIds = new Set<string>(ownTracks.map((t) => t._id));
    const targets: CascadeTarget[] = ownTracks.map((t) => ({ kind: "track", id: t._id }));

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();
    for (const comment of comments) {
      if (ownTrackIds.has(comment.trackId)) continue;
      if (args.deletionMode === "delete_everything") {
        targets.push({ kind: "comment", id: comment._id });
      } else {
        await ctx.db.patch(comment._id, { authorId: undefined, authorName: "Deleted User" });
      }
    }

    const grants = await ctx.db
      .query("trackAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const grant of grants) await ctx.db.delete(grant._id);

    await cascadeDelete(ctx, targets);
    await deleteAuthRecords(ctx, userId);
    await ctx.db.delete(userId);

    return { deleted: true };
  },
});

/**
 * Change the current user's password.
 * Requires verification of the current password before updating.
 */
export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify user is authenticated
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 2. Get user's email from database
    const user = await ctx.runQuery(api.users.viewer);
    if (!user?.email) throw new Error("No email associated with account");

    // 3. Validate new password length
    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    // 4. Verify current password using retrieveAccount
    try {
      await retrieveAccount(ctx, {
        provider: "password",
        account: {
          id: user.email,
          secret: args.currentPassword,
        },
      });
    } catch {
      throw new Error("Current password is incorrect");
    }

    // 5. Update to new password
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: user.email,
        secret: args.newPassword,
      },
    });

    // 6. Invalidate other sessions for security (keep current session)
    const sessionId = await getAuthSessionId(ctx);
    if (sessionId) {
      await invalidateSessions(ctx, {
        userId,
        except: [sessionId],
      });
    }

    return { success: true };
  },
});
