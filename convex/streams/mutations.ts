import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";

export const update = internalMutation({
  args: {
    streamId: v.id("streams"),
    updates: v.object({
      status: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("streaming"),
          v.literal("done"),
          v.literal("error"),
          v.literal("cancelled"),
        ),
      ),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const stream = await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });

    if (args.updates.status === "done" || args.updates.status === "cancelled") {
      const chunks = await ctx.db
        .query("streamChunks")
        .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
        .collect();
      await Promise.all(chunks.map((chunk) => ctx.db.delete(chunk._id)));
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
    await ctx.runMutation(internal.streams.crud.update, {
      id: args.streamId,
      patch: {
        status: "streaming",
      },
    });
    await ctx.db.insert("streamChunks", {
      streamId: args.streamId,
      chunks: args.chunks,
    });

    return await ctx.runQuery(api.streams.queries.get, {
      streamId: args.streamId,
    });
  },
});

export const cancel = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    
    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
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
    await ctx.db.delete(args.streamId);
    const chunks = await ctx.db
      .query("streamChunks")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .collect();
    await Promise.all(chunks.map((chunk) => ctx.db.delete(chunk._id)));
  },
});

export const cleanUp = internalMutation({
  args: {},
  handler: async (ctx, _args) => {
    // Get and delete all "done" streams immediately
    const doneStreams = await ctx.db
      .query("streams")
      .withIndex("by_status_user", (q) => q.eq("status", "done"))
      .collect();
    const doneChunks = await Promise.all(
      doneStreams.map(async (stream) => {
        const chunks = await ctx.db
          .query("streamChunks")
          .withIndex("by_stream", (q) => q.eq("streamId", stream._id))
          .collect();
        await Promise.all(chunks.map((chunk) => ctx.db.delete(chunk._id)));
        return chunks.flatMap((c) => c.chunks);
      }),
    );

    // Get and delete all "cancelled" streams immediately
    const cancelledStreams = await ctx.db
      .query("streams")
      .withIndex("by_status_user", (q) => q.eq("status", "cancelled"))
      .collect();
    const cancelledChunks = await Promise.all(
      cancelledStreams.map(async (stream) => {
        const chunks = await ctx.db
          .query("streamChunks")
          .withIndex("by_stream", (q) => q.eq("streamId", stream._id))
          .collect();
        await Promise.all(chunks.map((chunk) => ctx.db.delete(chunk._id)));
        return chunks.flatMap((c) => c.chunks);
      }),
    );

    // Get and delete "error" streams that are more than 15 minutes old
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    const errorStreams = await ctx.db
      .query("streams")
      .withIndex("by_status_user", (q) => q.eq("status", "error"))
      .filter((q) => q.lt(q.field("_creationTime"), fifteenMinutesAgo))
      .collect();
    const errorChunks = await Promise.all(
      errorStreams.map(async (stream) => {
        const chunks = await ctx.db
          .query("streamChunks")
          .withIndex("by_stream", (q) => q.eq("streamId", stream._id))
          .collect();
        await Promise.all(chunks.map((chunk) => ctx.db.delete(chunk._id)));
        return chunks.flatMap((c) => c.chunks);
      }),
    );

    return [...doneChunks, ...cancelledChunks, ...errorChunks].flat().length;
  },
});
