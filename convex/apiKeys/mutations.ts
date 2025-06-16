import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { createJwt } from "../utils/encryption";
import { api, internal } from "../_generated/api";

export const create = internalMutation({
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

export const createPublic = internalMutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existingApiKeyDoc = await ctx.runQuery(
      api.apiKeys.queries.getPublicFromKey,
      {
        key: args.key,
      },
    );
    if (existingApiKeyDoc) {
      await ctx.db.delete(existingApiKeyDoc._id);
    }

    const jwt = await createJwt(null, args.key, args.value);

    return await ctx.db.insert("apiKeys", {
      key: args.key,
      value: jwt,
    });
  },
});

export const remove = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const apiKey = await ctx.runQuery(api.apiKeys.queries.getFromKey, {
      key: args.key,
    });

    await ctx.db.delete(apiKey?._id!);
  },
});
