import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";

export const send = action({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    if (!chatInput.text && !chatInput.documents?.length) {
      throw new Error("Chat input text or documents not found");
    }

    if (!chatInput.model) {
      throw new Error("Model not found");
    }

    const stream = await ctx.runMutation(internal.streams.crud.create, {
      userId: chatInput.userId!,
      status: "pending",
    });
    await ctx.runMutation(api.chatInputs.mutations.update, {
      chatId: args.chatId,
      updates: {
        streamId: stream._id,
      },
    });

    await ctx.runAction(internal.langchain.index.chat, {
      chatId: args.chatId,
    });

    return null;
  },
});

export const removeMessage = action({
  args: {
    chatId: v.id("chats"),
    messageIndex: v.number(),
    cascade: v.boolean(),
  },
  handler: async (ctx, args): Promise<Record<string, any>> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const result = await ctx.runAction(
      internal.langchain.index.removeMessages,
      {
        chatId: args.chatId,
        messageIndex: args.messageIndex,
        cascade: args.cascade,
      },
    );

    return result;
  },
});

export const removeMessageGroup = action({
  args: {
    chatId: v.id("chats"),
    startIndex: v.number(),
    count: v.number(),
    cascade: v.boolean(),
  },
  handler: async (ctx, args): Promise<Record<string, any>> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const result = await ctx.runAction(
      internal.langchain.index.removeMessageGroup,
      {
        chatId: args.chatId,
        startIndex: args.startIndex,
        count: args.count,
        cascade: args.cascade,
      },
    );

    return result;
  },
});

export const regenerate = action({
  args: {
    chatId: v.id("chats"),
    startIndex: v.number(),
    count: v.number(),
  },
  handler: async (ctx, args): Promise<Record<string, any>> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    // First remove the AI response group
    await ctx.runAction(internal.langchain.index.removeMessageGroup, {
      chatId: args.chatId,
      startIndex: args.startIndex,
      count: args.count,
      cascade: false,
    });

    // Get the chat input to check if we need to create a stream
    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    // Create a new stream for the regenerated response
    const stream = await ctx.runMutation(internal.streams.crud.create, {
      userId: chatInput.userId!,
      status: "pending",
    });

    // Update the chat input with the new stream
    await ctx.runMutation(api.chatInputs.mutations.update, {
      chatId: args.chatId,
      updates: {
        streamId: stream._id,
      },
    });

    // Trigger new generation without adding a human message
    await ctx.runAction(internal.langchain.index.regenerateResponse, {
      chatId: args.chatId,
    });

    return { success: true };
  },
});

export const editMessage = action({
  args: {
    chatId: v.id("chats"),
    messageIndex: v.number(),
    newContent: v.string(),
    cascade: v.boolean(),
  },
  handler: async (ctx, args): Promise<Record<string, any>> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const result = await ctx.runAction(internal.langchain.index.editMessage, {
      chatId: args.chatId,
      messageIndex: args.messageIndex,
      newContent: args.newContent,
      cascade: args.cascade,
    });

    return result;
  },
});
