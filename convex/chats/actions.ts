import { api, internal } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { action } from "convex/_generated/server";
import { requireAuth } from "convex/utils/helpers";
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

    const chatInput = await ctx.runQuery(api.chatInput.queries.get, {
      chatId: args.chatId,
    });

    if (!chatInput.text) {
      throw new Error("Chat input not found");
    }

    if (!chatInput.model) {
      throw new Error("Model not found");
    }

    await ctx.runAction(internal.langchain.index.chat, { chatInputId: chatInput._id as Id<"chatInput"> });

    return null;
  },
});
