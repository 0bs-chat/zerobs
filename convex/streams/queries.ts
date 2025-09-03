import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";

export const getInternal = internalQuery({
  args: {
    chatId: v.id("chats"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
    .query("streams")
    .withIndex("by_chat_user", (q) =>
      q.eq("chatId", args.chatId).eq("userId", args.userId),
    )
    .first();
  },
});

export const get = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args): Promise<Doc<"streams"> | null> => {
    const { userId } = await requireAuth(ctx);

    return await ctx.runQuery(internal.streams.queries.getInternal, {
      chatId: args.chatId,
      userId: userId,
    });
  },
});

export const getChunks = query({
  args: {
    chatId: v.id("chats"),
    lastChunkTime: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    stream: Doc<"streams">;
    chunks: Doc<"streamChunks">[];
  }> => {
    const stream = await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });

    const chunks = await ctx.db
      .query("streamChunks")
      .withIndex("by_stream", (q) => q.eq("streamId", stream?._id!))
      .order("asc")
      .filter((q) =>
        args.lastChunkTime
          ? q.gt(q.field("_creationTime"), args.lastChunkTime)
          : true,
      ).collect();

    return {
      stream: stream!,
      chunks,
    };
  },
});
