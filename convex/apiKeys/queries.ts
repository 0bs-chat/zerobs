import { v } from "convex/values";
import { query } from "../_generated/server";
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
        q.eq("userId", userId).eq("key", args.key)
      )
      .first();

    if (!apiKeyDoc) {
      return null;
    }

    const { value } = await verifyJwt(apiKeyDoc.value);

    return {
      ...apiKeyDoc,
      value,
    };
  },
});
