import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";
import { mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import { Doc } from "../_generated/dataModel";
import { ChatMessages } from "../schema";

export const get = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    return messages;
  },
});

export const getMessageToRegenerate = internalQuery({
  args: {
    message: ChatMessages.doc,
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let messageToRegenerate: Doc<"chatMessages"> = args.message;
    while (true) {
      const parsed = mapStoredMessagesToChatMessages([
        JSON.parse(messageToRegenerate!.message),
      ])[0];
      if (parsed._getType() === "human") {
        break;
      }
      messageToRegenerate = (await ctx.db.get(messageToRegenerate.parentId!))!;
    }

    return messageToRegenerate;
  },
});
