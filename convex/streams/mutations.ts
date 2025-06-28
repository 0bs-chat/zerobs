import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import * as schema from "../schema";
import { partial } from "convex-helpers/validators";

export const removeStreamChunks = internalMutation({
  args: { streamId: v.id("streams") },
  handler: async (ctx, { streamId }) => {
    const refs = await ctx.db
      .query("streamChunkRefs")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
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
    streamId: v.id("streams"),
    updates: v.object(partial(schema.Streams.withoutSystemFields)),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });

    if (args.updates.status === "done" || args.updates.status === "cancelled") {
      await ctx.runMutation(internal.streams.mutations.removeStreamChunks, {
        streamId: args.streamId,
      });
    }

    await ctx.db.patch(args.streamId, {
      ...args.updates,
    });
  },
});

export const appendChunks = internalMutation({
  args: {
    streamId: v.id("streams"),
    chunks: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"streams">> => {
    let stream = await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });
    if (["done", "error", "cancelled"].includes(stream.status)) {
      return stream;
    }

    await ctx.runMutation(internal.streams.crud.update, {
      id: args.streamId,
      patch: {
        status: "streaming",
      },
    });
    stream.status = "streaming";
    const chunkDocId = await ctx.db.insert("streamChunks", {
      streamId: args.streamId,
      chunks: args.chunks,
    });
    await ctx.db.insert("streamChunkRefs", {
      streamId: args.streamId,
      chunkId: chunkDocId,
    });

    return stream;
  },
});

export const cancel = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const chatInput = await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });
    const stream = await ctx.runQuery(api.streams.queries.get, {
      streamId: chatInput.streamId!,
    });

    if (stream.status === "done" || stream.status === "error") {
      throw new Error("Cannot cancel a stream that is already done or errored");
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      streamId: stream._id,
      updates: { status: "cancelled" },
    });
  },
});

export const remove = internalMutation({
  args: {
    streamId: v.id("streams"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });

    // Remove the stream document and its associated chunks.
    await ctx.db.delete(args.streamId);
    await ctx.runMutation(internal.streams.mutations.removeStreamChunks, {
      streamId: args.streamId,
    });
    await ctx.runMutation(internal.streams.mutations.deleteState, {
      streamId: args.streamId,
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
        ctx.runMutation(internal.streams.mutations.removeStreamChunks, {
          streamId: stream._id,
        }),
      ),
    );

    // Sum up the total number of removed chunk references.
    const totalRemovedRefs = chunkCounts.reduce((a, b) => a + b, 0);
    return totalRemovedRefs;
  },
});

export const updateState = internalMutation({
  args: {
    streamId: v.id("streams"),
    updates: v.object(partial(schema.StreamStates.withoutSystemFields)),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("streamStates").withIndex("by_stream", (q) => q.eq("streamId", args.streamId)).first();
    if (!state) {
      await ctx.db.insert("streamStates", {
        streamId: args.streamId,
        sources: args.updates.sources ?? [],
        plan: args.updates.plan ?? [],
        pastSteps: args.updates.pastSteps ?? [],
      });
    } else {
      await ctx.db.patch(state._id, {
        ...args.updates,
      });
    }
  },
})

export const deleteState = internalMutation({
  args: {
    streamId: v.id("streams"),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("streamStates").withIndex("by_stream", (q) => q.eq("streamId", args.streamId)).first();
    if (state) {
      await ctx.db.delete(state._id);
    }
  },
});