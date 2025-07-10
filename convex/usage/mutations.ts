import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const incrementUsage = internalMutation({
  args: {
    userId: v.id("users"),
    messageCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const increment = args.messageCount || 1;

    // Check if user has existing usage record
    const existingUsage = await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existingUsage) {
      // Update existing record
      await ctx.db.patch(existingUsage._id, {
        messages: existingUsage.messages + increment,
      });
    } else {
      // Create new record
      await ctx.db.insert("usage", {
        userId: args.userId,
        messages: increment,
      });
    }

    return null;
  },
});
