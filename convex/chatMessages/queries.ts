import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";
import { buildMessageTree, getCurrentThread } from "./helpers";

export const get = query({
  args: {
    chatId: v.id("chats"),
    getCurrentThread: v.optional(v.boolean()),
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

    return args.getCurrentThread ? getCurrentThread(messages) : buildMessageTree(messages)
  },
});