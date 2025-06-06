import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, httpAction } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";
import { StateSnapshot } from "@langchain/langgraph";

export const send = action({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const chatInput = await ctx.runQuery(api.chatInput.queries.get, {
      chatId: args.chatId,
    });

    if (!chatInput.text) {
      throw new Error("Chat input not found");
    }

    if (!chatInput.model) {
      throw new Error("Model not found");
    }

    const stream = await ctx.runMutation(internal.streams.crud.create, {
      userId: chatInput.userId!,
      status: "pending",
    });
    await ctx.runMutation(api.chatInput.mutations.update, {
      chatId: args.chatId,
      updates: {
        streamId: stream._id,
      },
    });

    await ctx.runAction(internal.langchain.index.chat, {
      chatInputId: chatInput._id as Id<"chatInput">,
    });

    return null;
  },
});

export const messages = action({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args): Promise<string> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const messages = await ctx.runAction(internal.langchain.index.getState, {
      chatId: args.chatId,
    });

    return JSON.stringify(JSON.parse(messages) as StateSnapshot);
  },
});
