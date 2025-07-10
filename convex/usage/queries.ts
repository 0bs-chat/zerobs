import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";

export const getCurrentUsage = query({
  args: {},
  returns: v.object({
    totalMessages: v.number(),
  }),
  handler: async (ctx, _args) => {
    const { userId } = await requireAuth(ctx);

    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return {
      totalMessages: usage?.messages || 0,
    };
  },
});
