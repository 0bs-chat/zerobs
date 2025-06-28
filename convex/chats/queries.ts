import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";

export const get = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    return chat;
  },
});

export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filters: v.optional(
      v.object({
        pinned: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const userChats = await ctx.db
      .query("chats")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .filter((q) =>
        args.filters?.pinned === undefined
          ? true
          : q.eq(q.field("pinned"), args.filters.pinned),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return userChats;
  },
});

export const getMultiple = query({
  args: {
    chatIds: v.array(v.id("chats")),
  },
  handler: async (ctx, args): Promise<Doc<"chats">[]> => {
    await requireAuth(ctx);

    return await Promise.all(
      args.chatIds.map(async (chatId) => {
        const chat = await ctx.runQuery(api.chats.queries.get, {
          chatId,
        });

        return chat;
      }),
    );
  },
});

export const search = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chats = await ctx.db
      .query("chats")
      .withSearchIndex("by_name", (q) =>
        q.search("name", args.query).eq("userId", userId),
      )
      .take(10);

    return chats;
  },
});

export const getMessages = query({
  args: {
    chatId: v.id("chats"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    return await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", args.chatId)).order("desc").paginate(args.paginationOpts);
  },
});