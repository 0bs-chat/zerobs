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
    const stream = await ctx.db
      .query("streams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.streamId))
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
    lastChunkTime: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ) => {
    const stream = await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });

    const chunks = await ctx.db
      .query("streamChunks")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .order("asc")
      .filter((q) =>
        args.lastChunkTime ? q.gt(q.field("_creationTime"), args.lastChunkTime) : true,
      )
      .collect();

    return chunks;
  },
});