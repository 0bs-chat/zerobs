import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";
import { partial } from "convex-helpers/validators";
import * as schema from "../schema";

export const create = mutation({
  args: {
    ...schema.Chats.table.validator.fields,
    ...partial(schema.Chats.withoutSystemFields),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const chatId = ctx.db.insert("chats", {
      ...args,
      userId,
      name: args.name ?? "New Chat",
      pinned: false,
      updatedAt: Date.now(),
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
    const { userId } = await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    // Delete associated chat stream
    const chatStream = await ctx.db
      .query("streams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (chatStream) {
      await ctx.runMutation(internal.streams.mutations.remove, {
        streamId: chatStream._id,
      });
    }

    // Delete associated chat input
    const chatInput = await ctx.db
      .query("chatInputs")
      .withIndex("by_chat_user", (q) =>
        q.eq("chatId", args.chatId).eq("userId", userId)
      )
      .first();

    if (chatInput) {
      await ctx.runMutation(internal.chatInputs.mutations.remove, {
        chatId: args.chatId,
      });
    }

    // Finally delete the chat itself
    await ctx.db.delete(args.chatId);

    return null;
  },
});

// for atomic chat and input creation of new chats.
export const createWithInput = mutation({
  args: {
    name: v.string(),
    chatInput: v.object({
      model: v.string(),
      agentMode: v.optional(v.boolean()),
      plannerMode: v.optional(v.boolean()),
      webSearch: v.optional(v.boolean()),
      documents: v.optional(v.array(v.id("documents"))),
      projectId: v.optional(v.union(v.id("projects"), v.null())),
      artifacts: v.optional(v.boolean()),
      text: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chatId = await ctx.db.insert("chats", {
      name: args.name,
      userId,
      pinned: false,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("chatInputs", {
      ...args.chatInput,
      chatId,
      agentMode: args.chatInput.agentMode ?? false,
      plannerMode: args.chatInput.plannerMode ?? false,
      webSearch: args.chatInput.webSearch ?? false,
      artifacts: args.chatInput.artifacts ?? false,
      model: args.chatInput.model ?? "gemini-2.5-flash",
      userId,
      updatedAt: Date.now(),
    });

    return chatId;
  },
});
