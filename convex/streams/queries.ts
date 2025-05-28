import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";

export const get = query({
  args: {
    streamId: v.id("streams"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const stream = await ctx.db.query("streams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!stream) {
      throw new Error("Stream not found");
    }
    return stream;
  },
});

export const getChunks = query({
  args: {
    streamId: v.id("streams"),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });
    
    return await ctx.db.query("streamChunks")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .order("desc")
      .collect();
  },
});
