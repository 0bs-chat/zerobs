import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { verifyJwt } from "../utils/encryption";

export const getFromKey = internalQuery({
  args: {
    key: v.string(),
    userId: v.optional(v.string()),
    forceReturn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = args.userId
      ? { userId: args.userId }
      : await requireAuth(ctx);

    const apiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("key", args.key),
      )
      .first();

    if (!apiKeyDoc || (!apiKeyDoc.enabled && !args.forceReturn)) {
      return null;
    }

    const { value } = await verifyJwt(apiKeyDoc.value);

    return {
      ...apiKeyDoc,
      value,
    };
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

    return await Promise.all(
      userApiKeys.map(async (apiKeyDoc) => {
        const { value } = await verifyJwt(apiKeyDoc.value);

        return {
          ...apiKeyDoc,
          value,
        };
      }),
    );
  },
});
