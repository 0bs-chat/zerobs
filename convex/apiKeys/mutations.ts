import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { createJwt } from "../utils/encryption";

export const create = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    enabled: v.boolean(),
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

    const jwt = await createJwt(args.key, args.value, userId);

    await ctx.db.insert("apiKeys", {
      userId: userId,
      key: args.key,
      value: jwt,
      enabled: args.enabled,
    });

    return jwt;
  },
});

export const update = mutation({
  args: {
    key: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("key", args.key),
      )
      .first();

    if (!apiKey) {
      throw new Error("API key not found");
    }

    await ctx.db.patch(apiKey._id, { enabled: args.enabled });
  },
});

export const remove = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("key", args.key),
      )
      .first();

    if (apiKey) {
      await ctx.db.delete(apiKey._id);
    }
  },
});
