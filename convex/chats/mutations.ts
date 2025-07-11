import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";
import { partial } from "convex-helpers/validators";
import * as schema from "../schema";

export const create = mutation({
  args: {
    name: v.string(),
    model: v.string(),
    reasoningEffort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    projectId: v.union(v.id("projects"), v.null()),
    conductorMode: v.boolean(),
    orchestratorMode: v.boolean(),
    webSearch: v.boolean(),
    artifacts: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const chatId = ctx.db.insert("chats", {
      ...args,
      userId,
      pinned: false,
      reasoningEffort: args.reasoningEffort ?? "medium",
      updatedAt: Date.now(),
      public: false,
      documents: [],
      text: "",
    });
    return chatId;
  },
});

export const update = mutation({
  args: {
    chatId: v.id("chats"),
    updates: v.object(partial(schema.Chats.withoutSystemFields)),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    await ctx.db.patch(args.chatId, { ...args.updates, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    await ctx.db.delete(args.chatId);

    return null;
  },
});

export const createRaw = internalMutation({
  args: {
    chatId: v.id("chats"),
    messages: v.array(v.object({
      message: v.string(),
      parentId: v.optional(v.id("chatMessages")),
    })),
  },
  handler: async (ctx, args) => {
    // Create messages sequentially to maintain parent-child relationships
    let currentParent = args.messages[0]?.parentId ?? null;
    
    for (const message of args.messages) {
      const created = await ctx.runMutation(
        internal.chatMessages.crud.createInternal,
        {
          chatId: args.chatId,
          parentId: currentParent,
          message: message.message,
        }
      );
      // Set the current message as parent for the next message
      currentParent = created._id;
    }
    
    return null;
  },
});