import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { createJwt } from "../utils/encryption";
import { internal } from "../_generated/api";

export const create = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingApiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("key", args.key),
      )
      .first();
    if (existingApiKeyDoc) {
      await ctx.db.delete(existingApiKeyDoc._id);
    }

    const jwt = await createJwt(userId, args.key, args.value);

    await ctx.db.insert("apiKeys", {
      userId: userId,
      key: args.key,
      value: jwt,
    });

    return jwt;
  },
});

export const remove = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const apiKey = await ctx.runQuery(internal.apiKeys.queries.getFromKey, {
      key: args.key,
    });

    await ctx.db.delete(apiKey?._id!);
  },
});
