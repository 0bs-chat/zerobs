import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";

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
    const { userId } = await requireAuth(ctx);
    const { chatId, updates } = args;

    if (Object.keys(updates).length === 0) {
      // No actual updates provided
      return null;
    }

    const existingChat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), chatId))
      .first();

    if (!existingChat) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(existingChat._id, { ...updates, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingChat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!existingChat) {
      throw new Error("Chat not found");
    }

    // Delete associated chat stream
    const chatStream = await ctx.db
      .query("streams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (chatStream) {
      await ctx.runMutation(api.streams.mutations.remove, {
        streamId: chatStream._id,
      });
    }

    // Delete associated chat input
    const chatInput = await ctx.db
      .query("chatInput")
      .withIndex("by_user_chat", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId)
      )
      .first();

    if (chatInput) {
      await ctx.runMutation(api.chatInput.mutations.remove, {
        chatId: args.chatId,
      });
    }

    // Finally delete the chat itself
    await ctx.db.delete(args.chatId);

    return null;
  },
});
