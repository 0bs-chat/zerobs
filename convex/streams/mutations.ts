import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import * as schema from "../schema";
import { partial } from "convex-helpers/validators";

export const removeChunks = internalMutation({
  args: { streamId: v.id("streams") },
  handler: async (ctx, args): Promise<number> => {
    const refs = await ctx.db
      .query("streamChunkRefs")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .collect();

    await Promise.all([
      ...refs.map((ref) => ctx.db.delete(ref.chunkId)),
      ...refs.map((ref) => ctx.db.delete(ref._id)),
    ]);

    return refs.length;
  },
});

export const update = internalMutation({
  args: {
    chatId: v.id("chats"),
    updates: v.object(partial(schema.Streams.withoutSystemFields)),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const stream = await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });

    if (args.updates.status === "done" || args.updates.status === "cancelled") {
      await ctx.runMutation(internal.streams.mutations.removeChunks, {
        streamId: stream?._id!,
      });
    }

    await ctx.db.patch(stream?._id!, {
      ...args.updates,
    });
  },
});

export const flush = internalMutation({
  args: {
    chatId: v.id("chats"),
    chunks: v.array(v.string()),
    completedSteps: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<Doc<"streams">> => {
    let stream = await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });
    if (!stream) {
      throw new Error("Stream not found");
    }
    if (["done", "error", "cancelled"].includes(stream.status)) {
      return stream;
    }

    if (args.chunks.length > 0) {
      const chunkDocId = await ctx.db.insert("streamChunks", {
        streamId: stream._id,
        chunks: args.chunks,
      });
      await ctx.db.insert("streamChunkRefs", {
        streamId: stream._id,
        chunkId: chunkDocId,
      });
    }

    stream = (await ctx.runMutation(internal.streams.crud.update, {
      id: stream._id,
      patch: {
        status: "streaming",
        ...(args.completedSteps && { completedSteps: args.completedSteps }),
      },
    }))!;

    return stream;
  },
});

export const cancel = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });
    const stream = await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });
    if (!stream) {
      throw new Error("Stream not found");
    }

    if (stream.status === "done" || stream.status === "error") {
      throw new Error("Cannot cancel a stream that is already done or errored");
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      chatId: args.chatId,
      updates: { status: "cancelled" },
    });
  },
});

export const remove = internalMutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const stream = await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });
    if (!stream) {
      throw new Error("Stream not found");
    }
    await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });

    // Remove the stream document and its associated chunks.
    await ctx.db.delete(stream._id);
    await ctx.runMutation(internal.streams.mutations.removeChunks, {
      streamId: stream._id,
    });
  },
});

export const cleanUp = internalMutation({
  args: {},
  handler: async (ctx, _args): Promise<number> => {
    // Get "done" streams
    const doneStreams = await ctx.db
      .query("streams")
      .withIndex("by_status_user", (q) => q.eq("status", "done"))
      .collect();

    // Get "cancelled" streams
    const cancelledStreams = await ctx.db
      .query("streams")
      .withIndex("by_status_user", (q) => q.eq("status", "cancelled"))
      .collect();

    // Get "error" streams that are more than 15 minutes old
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    const errorStreams = await ctx.db
      .query("streams")
      .withIndex("by_status_user", (q) => q.eq("status", "error"))
      .filter((q) => q.lt(q.field("_creationTime"), fifteenMinutesAgo))
      .collect();

    const allStreamsToClean = [
      ...doneStreams,
      ...cancelledStreams,
      ...errorStreams,
    ];

    // Remove chunks for all collected streams in parallel by calling the new mutation.
    const chunkCounts = await Promise.all(
      allStreamsToClean.map((stream) =>
        ctx.runMutation(internal.streams.mutations.removeChunks, {
          streamId: stream._id,
        }),
      ),
    );

    // Sum up the total number of removed chunk references.
    const totalRemovedRefs = chunkCounts.reduce((a, b) => a + b, 0);
    return totalRemovedRefs;
  },
});
