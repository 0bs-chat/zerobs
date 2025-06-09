import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { api } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { ConvexCheckpointSaver } from "../checkpointer/checkpointer";
import { BaseMessage } from "@langchain/core/messages";

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
    paginationOpts: v.optional(paginationOptsValidator),
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
      .paginate(args.paginationOpts ?? { numItems: 10, cursor: null });

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

    const chats = await ctx.db.query("chats")
      .withSearchIndex("by_name", (q) => q.search("name", args.query).eq("userId", userId))
      .take(10);

    return chats;
  },
});

export const getMessages = query({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.object({
    page: v.any(),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (args.chatId === "new") {
      return {
        page: [],
        isDone: true,
        continueCursor: null,
      };
    }
    const checkpointer = new ConvexCheckpointSaver(ctx);

    const checkpoint = await checkpointer.get({ configurable: { thread_id: args.chatId } });
    const messages = (checkpoint?.channel_values as { messages: BaseMessage[] } | undefined)?.messages || [];
    
    // Pagination options with defaults
    const { numItems = 20, cursor = null } = args.paginationOpts || {};
    
    // Start from the end (most recent messages) and work backwards
    const totalMessages = messages.length;
    let startIndex = 0;
    let endIndex = totalMessages;
    
    if (cursor) {
      // Parse cursor to get the starting position
      try {
        const cursorIndex = parseInt(cursor, 10);
        if (cursorIndex >= 0 && cursorIndex < totalMessages) {
          endIndex = cursorIndex;
        }
      } catch (error) {
        // Invalid cursor, start from the end
        endIndex = totalMessages;
      }
    }
    
    // Calculate the slice bounds
    startIndex = Math.max(0, endIndex - numItems);
    const paginatedMessages = messages.slice(startIndex, endIndex);
    
    // Determine if there are more messages to load
    const isDone = startIndex === 0;
    const continueCursor = isDone ? null : startIndex.toString();

    return {
      page: JSON.stringify({
        ...checkpoint?.channel_values,
        messages: paginatedMessages,
      }, null, 2),
      isDone,
      continueCursor,
    };
  },
});
