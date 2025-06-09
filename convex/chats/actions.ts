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
      chatInputId: chatInput._id as Id<"chatInputs">,
    });

    return null;
  },
});
