import { requireAuth } from "../utils/helpers";
import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const create = mutation({
  args: {
    chatId: v.id("chats"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("streaming"),
        v.literal("done"),
        v.literal("error")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Verify user owns the chat
    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId as Id<"chats">,
    });

    // Check if chatStream already exists
    const existingChatStream = await ctx.db
      .query("chatStream")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .first();

    if (existingChatStream) {
      throw new Error("Chat stream already exists");
    }

    const chatStreamId = await ctx.db.insert("chatStream", {
      chatId: args.chatId,
      status: args.status ?? "pending",
      stream: "",
    });

    return chatStreamId;
  },
});

export const update = mutation({
  args: {
    chatId: v.id("chats"),
    updates: v.object({
      status: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("streaming"),
          v.literal("done"),
          v.literal("error")
        )
      ),
      stream: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Verify user owns the chat
    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId as Id<"chats">,
    });

    const existingChatStream = await ctx.db
      .query("chatStream")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .first();

    if (!existingChatStream) {
      throw new Error("Chat stream not found");
    }

    await ctx.db.patch(existingChatStream._id, args.updates);

    return null;
  },
});

export const remove = mutation({
  args: {
    chatId: v.id("chats"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Verify user owns the chat
    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId as Id<"chats">,
    });

    const existingChatStream = await ctx.db
      .query("chatStream")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .first();

    if (!existingChatStream) {
      throw new Error("Chat stream not found");
    }

    await ctx.db.delete(existingChatStream._id);

    return null;
  },
});

export const appendStream = internalMutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let chatStream = await ctx.db
      .query("chatStream")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .first();

    if (!chatStream) {
      const chatStreamId = await ctx.db.insert("chatStream", {
        chatId: args.chatId,
        status: "pending",
        stream: "",
      });

      chatStream = await ctx.db.get(chatStreamId);
      if (!chatStream) {
        throw new Error("Failed to create chat stream");
      }
    }

    await ctx.db.patch(chatStream._id, {
      stream: (chatStream.stream ?? "") + args.content,
      status: "streaming" as const,
    });

    return null;
  },
});

export const setStatus = internalMutation({
  args: {
    chatId: v.id("chats"),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("done"),
      v.literal("error")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingChatStream = await ctx.db
      .query("chatStream")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .first();

    if (!existingChatStream) {
      throw new Error("Chat stream not found");
    }

    await ctx.db.patch(existingChatStream._id, {
      status: args.status,
      ...(args.status === "done" && { stream: "" }),
    });

    return null;
  },
});
