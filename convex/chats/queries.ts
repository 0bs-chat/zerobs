import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";

export const get = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chat = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .first();

    if (!chat) {
      throw new Error("Chat not found");
    }

    return chat;
  },
});

export const getAll = query({
  args: {
    pinned: v.optional(v.boolean()),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const userChats = await ctx.db
      .query("chats")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .filter((q) =>
        args.pinned === undefined ? true : q.eq(q.field("pinned"), args.pinned)
      )
      .order("desc")
      .paginate(args.paginationOpts ?? { numItems: 10, cursor: null });

    return userChats;
  },
});

export const getMultiple = query({
  args: {
    chatIds: v.array(v.id("chats")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    return await Promise.all(
      args.chatIds.map(async (chatId) => {
        const chat = await ctx.db
          .query("chats")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("_id"), chatId))
          .first();

        if (!chat) {
          throw new Error("Chat not found");
        }

        return chat;
      })
    );
  },
});
