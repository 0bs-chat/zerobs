import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";

export const get = query({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  returns: v.union(
    v.object({
      _id: v.id("chatInput"),
      _creationTime: v.number(),
      chatId: v.union(v.id("chats"), v.literal("new")),
      userId: v.id("users"),
      documents: v.optional(v.array(v.id("documents"))),
      text: v.optional(v.string()),
      projectId: v.optional(v.id("projects")),
      model: v.optional(v.string()),
      agentMode: v.optional(v.boolean()),
      plannerMode: v.optional(v.boolean()),
      webSearch: v.optional(v.boolean()),
      updatedAt: v.number(),
      chat: v.optional(v.any()),
    }),
    v.object({
      chat: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chatInput = await ctx.db
      .query("chatInput")
      .withIndex("by_user_chat", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId)
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

export const getById = query({
  args: {
    chatInputId: v.id("chatInput"),
  },
  returns: v.object({
    _id: v.id("chatInput"),
    _creationTime: v.number(),
    chatId: v.union(v.id("chats"), v.literal("new")),
    userId: v.id("users"),
    documents: v.optional(v.array(v.id("documents"))),
    text: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    model: v.optional(v.string()),
    agentMode: v.optional(v.boolean()),
    plannerMode: v.optional(v.boolean()),
    webSearch: v.optional(v.boolean()),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chatInput = await ctx.db
      .query("chatInput")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatInputId))
      .first();

    if (!chatInput) {
      throw new Error("Chat input not found");
    }

    return chatInput;
  },
});
