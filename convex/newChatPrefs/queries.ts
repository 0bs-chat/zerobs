import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";

// yo mantra
// don't worry about it, you keep working on the stuff, i will integrate it in the tanstack start branch.
// don't remove it.

// gives us sync in cross-platform.
// no dual state management in the frontend with jotai.

export const get = query({
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);

    const prefs = await ctx.db
      .query("newChatPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return prefs;
  },
});
