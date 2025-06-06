import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";

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
