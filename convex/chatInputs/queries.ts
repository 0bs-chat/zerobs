import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { models } from "../langchain/models";
import { api } from "../_generated/api";

export const get = query({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chatInput = await ctx.db
      .query("chatInputs")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId),
      )
      .first();
    if (!chatInput && args.chatId !== "new") {
      throw new Error("Chat input not found");
    }

    // Get chat
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat && args.chatId !== "new") {
      throw new Error("Chat not found");
    }

    return {
      ...chatInput,
      chat,
    };
  },
});

export const getInternal = internalQuery({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (ctx, args) => {
    const chatInput = await ctx.db
      .query("chatInputs")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId),
      )
      .first();
    if (!chatInput && args.chatId !== "new") {
      throw new Error("Chat input not found");
    }

    // Get chat
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", chatInput?.userId!))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat && args.chatId !== "new") {
      throw new Error("Chat not found");
    }

    return {
      ...chatInput,
      chat,
    };
  },
});

export const getModels = query({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
    showHidden: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    selectedModel: (typeof models)[number];
    models: typeof models;
  }> => {
    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    let selectedModel = models.find(
      (model) => model.model_name === chatInput.model,
    );
    if (!selectedModel) {
      selectedModel = models[0];
    }
    return {
      selectedModel,
      models: args.showHidden
        ? models
        : models.filter((model) => !model.hidden),
    };
  },
});
