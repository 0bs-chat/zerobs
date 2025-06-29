import { requireAuth } from "../utils/helpers";
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import * as schema from "../schema";
import { partial } from "convex-helpers/validators";

export const create = mutation({
  args: {
    ...schema.ChatInputs.table.validator.fields,
    ...partial(schema.ChatInputs.withoutSystemFields),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    if (!args.chatId) {
      throw new Error("Chat ID is required");
    }

    // Check if chatInput already exists
    const existingChatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    if (existingChatInput) {
      throw new Error("Chat input already exists");
    }

    // Check if chat exists
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat) {
      throw new Error("Chat not found");
    }

    const newChatInputId = await ctx.db.insert("chatInputs", {
      ...args,
      text: "",
      agentMode: args.agentMode ?? false,
      plannerMode: args.plannerMode ?? false,
      webSearch: args.webSearch ?? false,
      artifacts: args.artifacts ?? false,
      model: args.model ?? "gemini-2.5-flash",
      chatId: args.chatId,
      userId,
      updatedAt: Date.now(),
    });

    const newChatInput = await ctx.db.get(newChatInputId);

    if (!newChatInput) {
      throw new Error("Chat input not found");
    }

    ctx.scheduler.runAfter(0, internal.langchain.index.generateTitle, {
      ...newChatInput,
      text: args.text,
    });

    return {
      ...newChatInput,
      chat,
    };
  },
});

export const update = mutation({
  args: {
    chatId: v.id("chats"),
    updates: v.object(partial(schema.ChatInputs.withoutSystemFields)),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    let existingChatInput = await ctx.db
      .query("chatInputs")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId)
      )
      .first();

    if (!existingChatInput) {
      throw new Error("Chat input not found");
    }

    // Check if chat exists
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Handle projectId separately to convert null to undefined
    const { projectId, ...otherUpdates } = args.updates;
    const updates = {
      ...otherUpdates,
      ...(projectId !== undefined && {
        projectId: projectId === null ? undefined : projectId,
      }),
    };

    await ctx.db.patch(existingChatInput._id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const remove = internalMutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingChatInput = await ctx.db
      .query("chatInputs")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId)
      )
      .first();

    if (!existingChatInput) {
      throw new Error("Chat input not found");
    }

    // Check if chat exists
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat) {
      throw new Error("Chat not found");
    }

    await ctx.db.delete(existingChatInput._id);

    return true;
  },
});
