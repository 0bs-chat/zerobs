import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";
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
    deepSearchMode: v.boolean(),
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
