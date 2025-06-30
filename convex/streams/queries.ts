import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";
import { paginationOptsValidator, PaginationResult } from "convex/server";
import type { Doc } from "../_generated/dataModel";

export const get = query({
  args: {
    streamId: v.id("streams"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const stream = await ctx.db.get(args.streamId);
    if (!stream) {
      throw new Error("Stream not found");
    }
    if (stream.userId !== userId) {
      throw new Error("Unauthorized");
    }
    return stream;
  },
});

export const getFromChatId = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args): Promise<Doc<"streams"> | null> => {
    await requireAuth(ctx);

    const chat = await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const streamId = chat?.streamId;

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
  handler: async (ctx, args): Promise<{
    stream: Doc<"streams">;
    chunks: PaginationResult<Doc<"streamChunks">>;
  }> => {
    const stream = await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });

    const chunks = await ctx.db
      .query("streamChunks")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .order("asc")
      .filter((q) =>
        args.lastChunkTime
          ? q.gt(q.field("_creationTime"), args.lastChunkTime)
          : true
      )
      .paginate({
        cursor: args.paginationOpts.cursor,
        numItems: args.paginationOpts.numItems,
      });

    return {
      stream,
      chunks,
    };
  },
});

export const getState = query({
  args: {
    streamId: v.id("streams"),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });

    return await ctx.db.query("streamStates").withIndex("by_stream", (q) => q.eq("streamId", args.streamId)).first();
  },
});

export const getAllChunks = query({
  args: {
    streamId: v.id("streams"),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });

    // Get all chunks reactively - Convex will push updates automatically
    const chunks = await ctx.db
      .query("streamChunks")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .order("asc")
      .collect();

    // Flatten all chunks into a single array of parsed events
    const events: string[] = [];
    chunks.forEach((chunkDoc) => {
      chunkDoc.chunks.forEach((chunkStr) => {
        events.push(chunkStr);
      });
    });

    return events;
  },
});
