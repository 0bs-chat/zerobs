import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const chatId = ctx.db.insert("chats", {
      userId,
      name: args.name,
      pinned: false,
      updatedAt: Date.now(),
    });
    return chatId;
  },
});

export const update = mutation({
  args: {
    chatId: v.id("chats"),
    updates: v.object({
      name: v.optional(v.string()),
      pinned: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (Object.keys(args.updates).length === 0) {
      // No actual updates provided
      return null;
    }

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    await ctx.db.patch(args.chatId, { ...args.updates, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    // Delete associated chat stream
    const chatStream = await ctx.db
      .query("streams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (chatStream) {
      await ctx.runMutation(internal.streams.mutations.remove, {
        streamId: chatStream._id,
      });
    }

    // Delete associated chat input
    const chatInput = await ctx.db
      .query("chatInputs")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId),
      )
      .first();

    if (chatInput) {
      await ctx.runMutation(internal.chatInputs.mutations.remove, {
        chatId: args.chatId,
      });
    }

    // Finally delete the chat itself
    await ctx.db.delete(args.chatId);

    return null;
  },
});
