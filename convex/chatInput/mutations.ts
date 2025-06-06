import { requireAuth } from "../utils/helpers";
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// TODO: Optimization
// - Instead of fetching the chat and checking if its new, check if before fetching
//  but this will create a race condition requring additional type safety, annoying af

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
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId),
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
      userId,
      updatedAt: Date.now(),
      ...args,
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
      streamId: v.optional(v.id("streams")),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    let existingChatInput = await ctx.db
      .query("chatInput")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId),
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

export const remove = internalMutation({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingChatInput = await ctx.db
      .query("chatInput")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId),
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
