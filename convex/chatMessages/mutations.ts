import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";
import { api } from "../_generated/api";
import schema from "../schema";
import { Doc, Id } from "../_generated/dataModel";
import { buildMessageLookups } from "./helpers";
import { mapChatMessagesToStoredMessages, HumanMessage } from "@langchain/core/messages";
import { omit } from "convex-helpers";

export const update = mutation({
  args: {
    id: v.id("chatMessages"),
    updates: v.object({
      message: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Verify ownership
    const message = await ctx.db.get(args.id);
    await ctx.runQuery(api.chats.queries.get, {
      chatId: message?.chatId!
    });

    return await ctx.db.patch(args.id, args.updates);
  },
});

export const create = mutation({
  args: {
    ...omit(schema.tables.chatMessages.validator.fields, ["message"]),
    text: v.string(),
    documents: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Verify ownership
    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId!,
    });

    return await ctx.db.insert("chatMessages", {
      chatId: args.chatId!,
      message: JSON.stringify(mapChatMessagesToStoredMessages([new HumanMessage({
        content: [
          {
            type: "text",
            text: args.text,
          },
          ...args.documents.map((documentId) => ({
            type: "file",
            file: {
              file_id: documentId,
            }
          })),
        ]
      })])[0]),
      parentId: args.parentId!,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("chatMessages"),
    cascade: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const message = await ctx.db.get(args.id);
    if (!message) {
      return;
    }

    await ctx.runQuery(api.chats.queries.get, {
      chatId: message.chatId,
    });

    if (!args.cascade) {
      return await ctx.db.delete(args.id);
    }

    const allMessagesInChat = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", message.chatId))
      .collect();

    const { childrenMap } = buildMessageLookups(allMessagesInChat);

    const messagesToDelete = new Map<Id<"chatMessages">, Doc<"chatMessages">>();
    const queue: Doc<"chatMessages">[] = [message];
    messagesToDelete.set(message._id, message);

    let head = 0;
    while (head < queue.length) {
      const currentMessage = queue[head++];
      const children = childrenMap.get(currentMessage._id) || [];
      for (const child of children) {
        if (!messagesToDelete.has(child._id)) {
          messagesToDelete.set(child._id, child);
          queue.push(child);
        }
      }
    }

    await Promise.all(
      Array.from(messagesToDelete.keys()).map((id) => ctx.db.delete(id)),
    );
  },
});
