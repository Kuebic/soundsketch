/**
 * One-time migration: isPublic (boolean) → visibility ("public" | "unlisted" | "private")
 *
 * Run this once via the Convex dashboard after deploying the schema change,
 * then delete this file.
 *
 * Usage: Call `migrations:migrateVisibility` from the Convex dashboard Functions tab.
 */
import { mutation } from "./_generated/server";

export const migrateVisibility = mutation({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    let migrated = 0;

    for (const track of tracks) {
      // Skip tracks that already have visibility set
      if ("visibility" in track && track.visibility) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const legacy = track as any;
      await ctx.db.patch(track._id, {
        visibility: legacy.isPublic ? "public" : "private",
      });
      migrated++;
    }

    return { migrated, total: tracks.length };
  },
});
