"use node";

import { z } from "zod"
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import {
  RemoveMessage,
  BaseMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";
import { api, internal } from "../_generated/api";
import { ConvexCheckpointSaver } from "../checkpointer/checkpointer";
import { agentGraph } from "./agent";
import { ChatInputs } from "../schema";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "./models";
import { createHumanMessage, processStreamWithBatching, streamHelper } from "./utils";

export const chat = internalAction({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const chatInput = await ctx.runQuery(internal.chatInputs.queries.getInternal, {
      chatId: args.chatId,
    });

    // Create AbortController for cancellation
    const abortController = new AbortController();
    const stream = streamHelper(ctx, {
      chatInput,
      signal: abortController.signal,
      includeHumanMessage: true,
    });

    await processStreamWithBatching(ctx, stream, chatInput.streamId!, abortController);
  },
});

export const removeMessageGroup = internalAction({
  args: {
    chatId: v.id("chats"),
    startIndex: v.number(),
    count: v.number(),
    cascade: v.boolean(),
  },
  handler: async (ctx, args) => {
    const checkpointer = new ConvexCheckpointSaver(ctx);
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: args.chatId },
    });
    const messages = checkpoint?.channel_values.messages as BaseMessage[];

    if (args.startIndex < 0 || args.startIndex >= messages.length) {
      throw new Error("Invalid start index");
    }

    if (args.count <= 0) {
      throw new Error("Count must be positive");
    }

    const endIndex = args.startIndex + args.count;
    if (endIndex > messages.length) {
      throw new Error("Count exceeds available messages");
    }

    let updatedMessages: RemoveMessage[] = [];
    if (args.cascade) {
      // Remove from startIndex to end of conversation
      updatedMessages = messages
        .slice(args.startIndex)
        .map((message) => new RemoveMessage({ id: message.id! }));
    } else {
      // Remove only the specified range
      updatedMessages = messages
        .slice(args.startIndex, endIndex)
        .map((message) => new RemoveMessage({ id: message.id! }));
    }

    return await agentGraph
      .compile({ checkpointer })
      .updateState(
        { configurable: { thread_id: args.chatId } },
        { messages: updatedMessages },
      );
  },
});

export const regenerateResponse = internalAction({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const chatInput = await ctx.runQuery(internal.chatInputs.queries.getInternal, {
      chatId: args.chatId,
    });

    // Create AbortController for cancellation
    const abortController = new AbortController();
    const stream = streamHelper(ctx, {
      chatInput,
      signal: abortController.signal,
      includeHumanMessage: false,
    });

    await processStreamWithBatching(ctx, stream, chatInput.streamId!, abortController);
  },
});

export const addMessage = internalAction({
  args: {
    chatInputDoc: ChatInputs.doc,
  },
  handler: async (ctx, args): Promise<Record<string, any>> => {
    const checkpointer = new ConvexCheckpointSaver(ctx);
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: args.chatInputDoc.chatId },
    });
    const messages = checkpoint?.channel_values.messages as BaseMessage[];

    if (!messages) {
      throw new Error("No messages found in chat");
    }

    const humanMessage = await createHumanMessage(ctx, args.chatInputDoc.text!, args.chatInputDoc.documents);

    await ctx.runMutation(api.chatInputs.mutations.update, {
      chatId: args.chatInputDoc.chatId,
      updates: { text: "", documents: [] },
    });

    const response = await agentGraph
      .compile({ checkpointer })
      .updateState(
        { configurable: { thread_id: args.chatInputDoc.chatId } },
        { messages: [...messages, humanMessage] },
      );

    return response;
  },
});

export const getMessageCount = internalAction({
  args: {
    chatId: v.id("chats"),
  },
  returns: v.object({
    totalMessages: v.number(),
  }),
  handler: async (ctx, args) => {
    const checkpointer = new ConvexCheckpointSaver(ctx);
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: args.chatId },
    });
    const messages = checkpoint?.channel_values.messages as BaseMessage[];

    return {
      totalMessages: messages ? messages.length : 0,
    };
  },
});

export const generateTitle = internalAction({
  args: {
    chatInputDoc: ChatInputs.doc,
  },
  handler: async (ctx, args) => {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant that generates titles for chats."],
      new MessagesPlaceholder("input"),
    ])
    const output = z.object({
      title: z.string(),
    })

    const modelWithOutputParser = prompt.pipe(
      await getModel("worker").withStructuredOutput(output),
    );

    if (args.chatInputDoc.chatId !== "new") {
      const response = await modelWithOutputParser.invoke({
        input: [await createHumanMessage(ctx, args.chatInputDoc.text!, args.chatInputDoc.documents)],
      });

      await ctx.runMutation(internal.chats.crud.update, {
        id: args.chatInputDoc.chatId,
        patch: { name: response.title, updatedAt: Date.now() },
      });
    }
  },
});

export const editMessage = internalAction({
  args: {
    chatId: v.id("chats"),
    messageIndex: v.number(),
    newContent: v.string(),
    documents: v.optional(v.array(v.id("documents"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const checkpointer = new ConvexCheckpointSaver(ctx);
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: args.chatId },
    });
    const messages = checkpoint?.channel_values.messages as BaseMessage[];

    if (!messages || args.messageIndex < 0 || args.messageIndex >= messages.length) {
      throw new Error("Invalid message index");
    }

    const messageToEdit = messages[args.messageIndex];

    if (!(messageToEdit instanceof HumanMessage)) {
      throw new Error("Only human messages can be edited");
    }

    // For human messages, create a new HumanMessage with updated content
    const updatedMessage = await createHumanMessage(ctx, args.newContent, args.documents);
    updatedMessage.id = messageToEdit.id; // Preserve the original ID

    // Create a new messages array with the updated message
    const updatedMessages = [...messages];
    updatedMessages[args.messageIndex] = updatedMessage;

    // Update the state with the new messages array
    await agentGraph
      .compile({ checkpointer })
      .updateState(
        { configurable: { thread_id: args.chatId } },
        { messages: updatedMessages },
      );

    return null;
  },
});