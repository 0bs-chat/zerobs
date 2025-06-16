import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";
import { Doc } from "../_generated/dataModel";

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

export const getFromChatId = query({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (ctx, args): Promise<Doc<"streams"> | null> => {
    await requireAuth(ctx);

    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    const streamId = chatInput?.streamId;

    if (!streamId) {
      return null;
    }

    return await ctx.runQuery(api.streams.queries.get, {
      streamId: streamId,
    });
  },
});

export const getChunks = query({
  args: {
    streamId: v.id("streams"),
    paginationOpts: paginationOptsValidator,
    lastChunkTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });

    return await ctx.db
      .query("streamChunks")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .order("asc")
      .filter((q) =>
        args.lastChunkTime
          ? q.gt(q.field("_creationTime"), args.lastChunkTime)
          : true,
      )
      .paginate({
        cursor: args.paginationOpts.cursor,
        numItems: args.paginationOpts.numItems,
      });
  },
});
