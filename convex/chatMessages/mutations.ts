import { internalMutation, mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import {
  mapChatMessagesToStoredMessages,
  HumanMessage,
} from "@langchain/core/messages";
import { omit } from "convex-helpers";
import type { Id } from "../_generated/dataModel";

export const updateInput = mutation({
  args: {
    id: v.id("chatMessages"),
    updates: v.object({
      text: v.string(),
      documents: v.array(v.id("documents")),
    }),
    applySame: v.optional(v.boolean()),
  },
  returns: v.id("chatMessages"),
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (args.updates.text === "" && args.updates.documents.length === 0) {
      throw new Error("No updates provided");
    }

    // Verify ownership
    const message = await ctx.db.get(args.id);
    await ctx.runQuery(api.chats.queries.get, {
      chatId: message?.chatId!,
    });

    const newMessage = {
      message: JSON.stringify(
        mapChatMessagesToStoredMessages([
          new HumanMessage({
            content: [
              ...(args.updates.text !== ""
                ? [
                    {
                      type: "text",
                      text: args.updates.text,
                    },
                  ]
                : []),
              ...(args.updates.documents.length > 0
                ? args.updates.documents.map((documentId) => ({
                    type: "file",
                    file: {
                      file_id: documentId,
                    },
                  }))
                : []),
            ],
          }),
        ])[0],
      ),
    };

    if (args.applySame) {
      await ctx.db.patch(args.id, newMessage);
      return args.id;
    } else {
      return await ctx.db.insert("chatMessages", {
        chatId: message?.chatId!,
        parentId: message?.parentId!,
        message: newMessage.message,
        minimized: message?.minimized!,
      });
    }
  },
});

export const toggleMinimized = mutation({
  args: {
    id: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const message = await ctx.db.get(args.id);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify ownership
    await ctx.runQuery(api.chats.queries.get, {
      chatId: message.chatId!,
    });

    await ctx.db.patch(args.id, {
      minimized: !message.minimized,
    });

    return args.id;
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

    if (args.text === "" && args.documents.length === 0) {
      throw new Error("No text or documents provided");
    }

    // Verify ownership
    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId!,
    });

    return await ctx.db.insert("chatMessages", {
      chatId: args.chatId!,
      message: JSON.stringify(
        mapChatMessagesToStoredMessages([
          new HumanMessage({
            content: [
              {
                type: "text",
                text: args.text,
              },
              ...args.documents.map((documentId) => ({
                type: "file",
                file: {
                  file_id: documentId,
                },
              })),
            ],
          }),
        ])[0],
      ),
      parentId: args.parentId!,
      minimized: false,
    });
  },
});

export const regenerate = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
  },
  handler: async (ctx, args): Promise<Id<"chatMessages">> => {
    await requireAuth(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    await ctx.runQuery(api.chats.queries.get, {
      chatId: message.chatId!,
    });

    const messageToRegenerate = await ctx.runQuery(
      internal.chatMessages.queries.getMessageToRegenerate,
      {
        message: message,
      },
    );

    return await ctx.db.insert("chatMessages", {
      chatId: messageToRegenerate.chatId,
      parentId: messageToRegenerate.parentId,
      message: messageToRegenerate.message,
      minimized: messageToRegenerate.minimized,
    });
  },
});
