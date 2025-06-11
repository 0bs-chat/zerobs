import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { verifyJwt } from "../utils/encryption";

export const getFromKey = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const apiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("key", args.key),
      )
      .first();

    if (!apiKeyDoc) {
      return null;
    }

    const { value } = await verifyJwt(apiKeyDoc.value);

    return {
      ...apiKeyDoc,
      value,
    }
  },
});

export const getPublicFromKey = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) =>
        q.eq("key", args.key),
      )
      .first();

    if (!apiKeyDoc || apiKeyDoc.userId) {
      return null;
    }

    const { value } = await verifyJwt(apiKeyDoc.value);

    return {
      ...apiKeyDoc,
      value,
    }
  },
});

export const getFromValue = internalQuery({
  args: {
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const apiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_value_user", (q) =>
        q.eq("value", args.value).eq("userId", userId),
      )
      .first();

    if (!apiKeyDoc) {
      throw new Error("API key not found");
    }

    const { value } = await verifyJwt(apiKeyDoc.value);

    return {
      ...apiKeyDoc,
      value,
    }
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx, _args) => {
    const { userId } = await requireAuth(ctx);

    const userApiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_key", (q) => q.eq("userId", userId))
      .collect();

    return await Promise.all(userApiKeys.map(async (apiKeyDoc) => {
      const { value } = await verifyJwt(apiKeyDoc.value);

      return {
        ...apiKeyDoc,
        value,
      }
    }));
  },
});
