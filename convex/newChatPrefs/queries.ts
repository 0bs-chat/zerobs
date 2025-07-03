import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";

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
