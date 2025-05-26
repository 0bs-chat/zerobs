import { requireAuth } from "../utils/helpers";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
    documents: v.optional(v.array(v.id("documents"))),
    text: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    model: v.optional(v.string()),
    agentMode: v.optional(v.boolean()),
    plannerMode: v.optional(v.boolean()),
    webSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    // Check if chatInput already exists
    const existingChatInput = await ctx.db
      .query("chatInput")
      .withIndex("by_user_chat", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId)
      )
      .first();

    if (existingChatInput && args.chatId !== "new") {
      throw new Error("Chat input already exists");
    }

    // Check if chat exists
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat && args.chatId !== "new") {
      throw new Error("Chat not found");
    }

    const newChatInputId = await ctx.db.insert("chatInput", {
      chatId: args.chatId,
      userId,
      documents: args.documents,
      text: args.text,
      projectId: args.projectId,
      model: args.model,
      agentMode: args.agentMode,
      plannerMode: args.plannerMode,
      webSearch: args.webSearch,
      updatedAt: Date.now(),
    });
    const newChatInput = await ctx.db.get(newChatInputId);

    if (!newChatInput) {
      throw new Error("Chat input not found");
    }

    return {
      ...newChatInput,
      chat,
    };
  },
});

export const update = mutation({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
    updates: v.object({
      documents: v.optional(v.array(v.id("documents"))),
      text: v.optional(v.string()),
      projectId: v.optional(v.id("projects")),
      model: v.optional(v.string()),
      agentMode: v.optional(v.boolean()),
      plannerMode: v.optional(v.boolean()),
      webSearch: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    let existingChatInput = await ctx.db
      .query("chatInput")
      .withIndex("by_user_chat", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId)
      )
      .first();

    if (!existingChatInput) {
      throw new Error("Chat input not found");
    }

    // Check if chat exists
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat && args.chatId !== "new") {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(existingChatInput._id, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const remove = mutation({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingChatInput = await ctx.db
      .query("chatInput")
      .withIndex("by_user_chat", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId)
      )
      .first();

    if (!existingChatInput || args.chatId === "new") {
      throw new Error("Chat input not found");
    }

    // Check if chat exists
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat && args.chatId !== "new") {
      throw new Error("Chat not found");
    }

    await ctx.db.delete(existingChatInput._id);

    return true;
  },
});
