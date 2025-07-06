import { internalMutation, mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { mapChatMessagesToStoredMessages, HumanMessage } from "@langchain/core/messages";
import { omit } from "convex-helpers";
import { Id } from "../_generated/dataModel";

export const updateInput = mutation({
  args: {
    id: v.id("chatMessages"),
    updates: v.object({
      text: v.optional(v.string()),
      documents: v.optional(v.array(v.id("documents"))),
    }),
    applySame: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (!args.updates.text && !args.updates.documents) {
      throw new Error("No updates provided");
    }

    // Verify ownership
    const message = await ctx.db.get(args.id);
    await ctx.runQuery(api.chats.queries.get, {
      chatId: message?.chatId!,
    });

    const newMessage = {
      message: JSON.stringify(mapChatMessagesToStoredMessages([new HumanMessage({
        content: [
          ...(args.updates.text ? [{
            type: "text",
            text: args.updates.text,
          }] : []),
          ...(args.updates.documents ? args.updates.documents.map((documentId) => ({
            type: "file",
            file: {
              file_id: documentId,
            }
          })) : []),
        ]
      })])[0]),
    };

    if (args.applySame) {
      return await ctx.db.patch(args.id, newMessage);
    } else {
      return await ctx.db.insert("chatMessages", {
        chatId: message?.chatId!,
        parentId: message?.parentId!,
        message: newMessage.message,
      });
    }
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

export const regenerate = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
  },
  handler: async (ctx, args): Promise<Id<"chats">> => {
    await requireAuth(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    await ctx.runQuery(api.chats.queries.get, {
      chatId: message.chatId!,
    });

    const messageToRegenerate = await ctx.runQuery(internal.chatMessages.queries.getMessageToRegenerate, {
      message: message,
    });

    await ctx.db.insert("chatMessages", {
      chatId: messageToRegenerate.chatId,
      parentId: messageToRegenerate.parentId,
      message: messageToRegenerate.message,
    });

    return messageToRegenerate.chatId;
  }
});
