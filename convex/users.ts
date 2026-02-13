import { query } from "./_generated/server";

/**
 * Get the currently authenticated user.
 * Returns null if not authenticated, undefined while loading.
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return {
      id: identity.subject,
      name: identity.name,
      email: identity.email,
    };
  },
});
