import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const get = query({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (args.chatId !== "new") {
      // Verify user owns the chat
      await ctx.runQuery(api.chats.queries.get, {
        chatId: args.chatId as Id<"chats">,
      });

      const chatStream = await ctx.db
        .query("chatStream")
        .withIndex("by_chat", (q) => q.eq("chatId", args.chatId as Id<"chats">))
        .first();

      return chatStream;
    }

    return {
      status: "pending",
      stream: "",
    };
  },
});
