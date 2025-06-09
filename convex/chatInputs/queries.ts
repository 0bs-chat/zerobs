import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { parsedConfig } from "../langchain/models";
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

export const getById = internalQuery({
  args: {
    chatInputId: v.id("chatInputs"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chatInput = await ctx.db.get(args.chatInputId);
    if (!chatInput || chatInput.userId !== userId) {
      throw new Error("Chat input not found");
    }

    return chatInput;
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
    selectedModel: typeof parsedConfig.model_list[number];
    models: typeof parsedConfig.model_list;
  }> => {
    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    let selectedModel = parsedConfig.model_list.find((model) => model.model_name === chatInput.model);
    if (!selectedModel) {
      selectedModel = parsedConfig.model_list[0];
    }
    return {
      selectedModel,
      models: args.showHidden ? parsedConfig.model_list : parsedConfig.model_list.filter((model) => !model.litellm_params.tags?.includes("hidden")),
    };
  },
});
