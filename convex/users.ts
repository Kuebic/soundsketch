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

/**
 * Update the current user's email.
 */
export const updateEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

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
 * @param deletionMode - "keep_comments" to anonymize comments, "delete_everything" to remove all
 */
export const deleteAccount = mutation({
  args: {
    deletionMode: v.union(v.literal("keep_comments"), v.literal("delete_everything")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const r2KeysToDelete: string[] = [];

    // 1. Find and delete all user's tracks and their associated data
    const userTracks = await ctx.db
      .query("tracks")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .collect();

    for (const track of userTracks) {
      // Get all versions for this track
      const versions = await ctx.db
        .query("versions")
        .withIndex("by_track", (q) => q.eq("trackId", track._id))
        .collect();

      // Collect R2 keys and delete versions
      for (const version of versions) {
        r2KeysToDelete.push(version.r2Key);
        await ctx.db.delete(version._id);
      }

      // Delete all comments on this track
      const trackComments = await ctx.db
        .query("comments")
        .withIndex("by_track", (q) => q.eq("trackId", track._id))
        .collect();

      for (const comment of trackComments) {
        if (comment.attachmentR2Key) {
          r2KeysToDelete.push(comment.attachmentR2Key);
        }
        await ctx.db.delete(comment._id);
      }

      // Delete all access records for this track
      const accessRecords = await ctx.db
        .query("trackAccess")
        .withIndex("by_track", (q) => q.eq("trackId", track._id))
        .collect();

      for (const record of accessRecords) {
        await ctx.db.delete(record._id);
      }

      // Delete the track itself
      await ctx.db.delete(track._id);
    }

    // 2. Handle user's comments on OTHER people's tracks
    // We need to find all comments by this user across all tracks
    const allComments = await ctx.db.query("comments").collect();
    const userCommentsOnOtherTracks = allComments.filter(
      (c) => c.authorId === userId && !userTracks.some((t) => t._id === c.trackId)
    );

    for (const comment of userCommentsOnOtherTracks) {
      if (args.deletionMode === "delete_everything") {
        // Delete the comment entirely
        if (comment.attachmentR2Key) {
          r2KeysToDelete.push(comment.attachmentR2Key);
        }
        await ctx.db.delete(comment._id);
      } else {
        // Anonymize the comment - keep content but remove author association
        await ctx.db.patch(comment._id, {
          authorId: undefined,
          authorName: "Deleted User",
        });
      }
    }

    // 3. Delete trackAccess records where user is a collaborator
    const userAccessRecords = await ctx.db
      .query("trackAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const record of userAccessRecords) {
      await ctx.db.delete(record._id);
    }

    // 4. Delete the user record
    await ctx.db.delete(userId);

    // 5. Schedule R2 file deletion (async to not block the mutation)
    if (r2KeysToDelete.length > 0) {
      await ctx.scheduler.runAfter(0, api.r2.deleteR2Objects, {
        r2Keys: r2KeysToDelete,
      });
    }

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
