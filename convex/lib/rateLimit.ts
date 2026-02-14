import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

/**
 * Check and enforce a rate limit. Throws ConvexError if the limit is exceeded.
 *
 * @param ctx - Convex mutation context
 * @param key - Unique key for this rate limit (e.g. "comment:userId" or "upload:userId")
 * @param maxRequests - Maximum number of requests allowed within the window
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  maxRequests: number,
  windowMs: number,
) {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (existing) {
    const recentTimestamps = existing.timestamps.filter(
      (t) => t > windowStart,
    );

    if (recentTimestamps.length >= maxRequests) {
      throw new ConvexError(
        "Too many requests. Please wait before trying again.",
      );
    }

    await ctx.db.patch(existing._id, {
      timestamps: [...recentTimestamps, now],
    });
  } else {
    await ctx.db.insert("rateLimits", { key, timestamps: [now] });
  }
}
