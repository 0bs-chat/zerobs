import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";

export const send = action({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    if (!chatInput.text && !chatInput.documents?.length) {
      throw new Error("Chat input text or documents not found");
    }

    if (!chatInput.model) {
      throw new Error("Model not found");
    }

    const stream = await ctx.runMutation(internal.streams.crud.create, {
      userId: chatInput.userId!,
      status: "pending",
    });
    await ctx.runMutation(api.chatInputs.mutations.update, {
      chatId: args.chatId,
      updates: {
        streamId: stream._id,
      },
    });

    await ctx.runAction(internal.langchain.index.chat, {
      chatId: args.chatId,
    });

    return null;
  },
});

export const removeMessageGroup = action({
  args: {
    chatId: v.id("chats"),
    startIndex: v.number(),
    count: v.number(),
    cascade: v.boolean(),
  },
  handler: async (ctx, args): Promise<Record<string, any>> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const result = await ctx.runAction(
      internal.langchain.index.removeMessageGroup,
      {
        chatId: args.chatId,
        startIndex: args.startIndex,
        count: args.count,
        cascade: args.cascade,
      },
    );

    return result;
  },
});

export const regenerate = action({
  args: {
    chatId: v.id("chats"),
    startIndex: v.number(),
    count: v.number(),
  },
  handler: async (ctx, args): Promise<Record<string, any>> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    // First remove the AI response group
    await ctx.runAction(internal.langchain.index.removeMessageGroup, {
      chatId: args.chatId,
      startIndex: args.startIndex,
      count: args.count,
      cascade: false,
    });

    // Get the chat input to check if we need to create a stream
    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    // Create a new stream for the regenerated response
    const stream = await ctx.runMutation(internal.streams.crud.create, {
      userId: chatInput.userId!,
      status: "pending",
    });

    // Update the chat input with the new stream
    await ctx.runMutation(api.chatInputs.mutations.update, {
      chatId: args.chatId,
      updates: {
        streamId: stream._id,
      },
    });

    // Trigger new generation without adding a human message
    await ctx.runAction(internal.langchain.index.regenerateResponse, {
      chatId: args.chatId,
    });

    return { success: true };
  },
});

export const regenerateFromUser = action({
  args: {
    chatId: v.id("chats"),
    startIndex: v.number(),
    count: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    // For user message regeneration, we need to remove all messages after the user message
    // First, we need to check if there are any messages after the user group
    const checkpointResult = await ctx.runAction(internal.langchain.index.getMessageCount, {
      chatId: args.chatId,
    });

    const totalMessages = checkpointResult.totalMessages;
    const messagesAfterUserGroup = totalMessages - (args.startIndex + args.count);

    // Only remove messages if there are any after the user group
    if (messagesAfterUserGroup > 0) {
      await ctx.runAction(internal.langchain.index.removeMessageGroup, {
        chatId: args.chatId,
        startIndex: args.startIndex + args.count, // Start from the message after the user group
        count: messagesAfterUserGroup, // Remove all subsequent messages
        cascade: true,
      });
    }

    // Get the chat input to check if we need to create a stream
    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    // Create a new stream for the regenerated response
    const stream = await ctx.runMutation(internal.streams.crud.create, {
      userId: chatInput.userId!,
      status: "pending",
    });

    // Update the chat input with the new stream
    await ctx.runMutation(api.chatInputs.mutations.update, {
      chatId: args.chatId,
      updates: {
        streamId: stream._id,
      },
    });

    // Trigger new generation without adding a human message
    await ctx.runAction(internal.langchain.index.regenerateResponse, {
      chatId: args.chatId,
    });

    return { success: true };
  },
});

export const editMessage = action({
  args: {
    chatId: v.id("chats"),
    messageIndex: v.number(),
    newContent: v.string(),
    documents: v.optional(v.array(v.id("documents"))),
    regenerateAfterEdit: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    // Edit the message
    await ctx.runAction(internal.langchain.index.editMessage, {
      chatId: args.chatId,
      messageIndex: args.messageIndex,
      newContent: args.newContent,
      documents: args.documents,
    });

    // If regenerateAfterEdit is true, regenerate responses after the edited message
    if (args.regenerateAfterEdit) {
      // Get the total message count to determine if there are messages after the edited one
      const checkpointResult = await ctx.runAction(internal.langchain.index.getMessageCount, {
        chatId: args.chatId,
      });

      const totalMessages = checkpointResult.totalMessages;
      const messagesAfterEdited = totalMessages - (args.messageIndex + 1);

      // Remove all messages after the edited message if any exist
      if (messagesAfterEdited > 0) {
        await ctx.runAction(internal.langchain.index.removeMessageGroup, {
          chatId: args.chatId,
          startIndex: args.messageIndex + 1,
          count: messagesAfterEdited,
          cascade: true,
        });
      }

      // Get the chat input to create a stream for regeneration
      const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
        chatId: args.chatId,
      });

      // Create a new stream for the regenerated response
      const stream = await ctx.runMutation(internal.streams.crud.create, {
        userId: chatInput.userId!,
        status: "pending",
      });

      // Update the chat input with the new stream
      await ctx.runMutation(api.chatInputs.mutations.update, {
        chatId: args.chatId,
        updates: {
          streamId: stream._id,
        },
      });

      // Trigger new generation without adding a human message
      await ctx.runAction(internal.langchain.index.regenerateResponse, {
        chatId: args.chatId,
      });
    }

    return { success: true };
  },
});
