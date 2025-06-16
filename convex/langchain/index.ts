"use node";

import { z } from "zod"
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  HumanMessage,
  RemoveMessage,
  BaseMessage,
  AIMessage,
} from "@langchain/core/messages";
import { api, internal } from "../_generated/api";
import { ConvexCheckpointSaver } from "../checkpointer/checkpointer";
import { agentGraph } from "./agent";
import { ChatInputs, Chats } from "../schema";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getModel } from "./models";
import { FunctionReturnType } from "convex/server";

/**
 * Helper function to create a HumanMessage with text and document attachments
 */
async function createHumanMessage(
  ctx: ActionCtx,
  text: string,
  documents?: Id<"documents">[]
): Promise<HumanMessage> {
  return new HumanMessage({
    content: [
      {
        type: "text",
        text,
      },
      ...(await Promise.all(
        documents?.map(async (documentId) => {
          let document = await ctx.runQuery(api.documents.queries.get, {
            documentId,
          });

          return {
            type: "file",
            file: {
              file_id: document._id,
            },
          };
        }) ?? [],
      )),
    ],
  });
}

export const chat = internalAction({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const chatInput = await ctx.runQuery(internal.chatInputs.queries.getInternal, {
      chatId: args.chatId,
    });
    let streamDoc: Doc<"streams"> | null = null;

    // Create AbortController for cancellation
    const abortController = new AbortController();
    const stream = await streamHelper(ctx, {
      chatInput,
      signal: abortController.signal,
    });

    // ---- new batching logic ----
    const streamId = chatInput.streamId!;
    const BUFFER_FLUSH_DELAY = 300; // ms
    const CANCELLATION_CHECK_DELAY = 1000; // ms - check for cancellation every 1s
    let lastFlush = Date.now();
    let lastCancellationCheck = Date.now();
    const buffer: string[] = [];
    let wasCancelled = false;

    try {
      for await (const event of stream) {
        // Check for cancellation periodically, not on every event
        const now = Date.now();
        if (now - lastCancellationCheck >= CANCELLATION_CHECK_DELAY) {
          const currentStream = await ctx.runQuery(api.streams.queries.get, {
            streamId,
          });
          if (currentStream.status === "cancelled") {
            wasCancelled = true;
            abortController.abort();
            break;
          }
          lastCancellationCheck = now;
        }

        // collect
        buffer.push(JSON.stringify(event));

        // if it's been >300ms since last flush, send a batch
        if (now - lastFlush >= BUFFER_FLUSH_DELAY) {
          streamDoc = await ctx.runMutation(
            internal.streams.mutations.appendChunks,
            {
              streamId,
              chunks: buffer.splice(0, buffer.length),
            },
          );
          lastFlush = now;

          // Also check cancellation status from the returned streamDoc
          if (streamDoc.status === "cancelled") {
            wasCancelled = true;
            abortController.abort();
            break;
          }
        }
      }

      if (buffer.length > 0 && !wasCancelled) {
        streamDoc = await ctx.runMutation(
          internal.streams.mutations.appendChunks,
          {
            streamId,
            chunks: buffer.splice(0, buffer.length),
          },
        );

        // Final check after flushing remaining buffer
        if (streamDoc.status === "cancelled") {
          wasCancelled = true;
        }
      }

      // Only mark as done if not cancelled
      if (!wasCancelled) {
        await ctx.runMutation(internal.streams.mutations.update, {
          streamId,
          updates: { status: "done" },
        });
      }
    } catch (error) {
      console.error(error);

      // If we already know it was cancelled, don't override the status
      if (wasCancelled) {
        return;
      }

      // Check if the error was due to cancellation
      const errorStatus =
        streamDoc?.status ||
        (await ctx.runQuery(api.streams.queries.get, { streamId })).status;

      if (errorStatus === "cancelled") {
        return;
      }

      await ctx.runMutation(internal.streams.mutations.update, {
        streamId,
        updates: { status: "error" },
      });
    }
  },
});

async function* streamHelper(
  ctx: ActionCtx,
  args: { chatInput: FunctionReturnType<typeof internal.chatInputs.queries.getInternal>; signal?: AbortSignal },
) {
  const humanMessage = await createHumanMessage(ctx, args.chatInput.text!, args.chatInput.documents);

  await ctx.runMutation(api.chatInputs.mutations.update, {
    chatId: args.chatInput.chatId!,
    updates: { text: "", documents: [] },
  });

  const checkpointer = new ConvexCheckpointSaver(ctx);
  const streamConfig = {
    version: "v2" as const,
    configurable: {
      ctx,
      chatInput: args.chatInput,
      thread_id: args.chatInput.chatId,
    },
    recursionLimit: 100,
    ...(args.signal && { signal: args.signal }),
  };

  const response = agentGraph
    .compile({ checkpointer })
    .streamEvents({ messages: [humanMessage] }, streamConfig);

  for await (const event of response) {
    if (
      ["on_chat_model_stream", "on_tool_start", "on_tool_end"].includes(
        event.event,
      )
    ) {
      const allowedNodes = ["baseAgent"];
      if (
        allowedNodes.some((node) =>
          event.metadata.checkpoint_ns.startsWith(node),
        )
      ) {
        yield event;
      }
    }
  }
}

export const removeMessages = internalAction({
  args: {
    chatId: v.id("chats"),
    messageIndex: v.number(),
    cascade: v.boolean(),
  },
  handler: async (ctx, args) => {
    const checkpointer = new ConvexCheckpointSaver(ctx);
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: args.chatId },
    });
    const messages = checkpoint?.channel_values.messages as BaseMessage[];

    if (!messages) {
      throw new Error("No messages found in chat");
    }

    if (args.messageIndex < 0 || args.messageIndex >= messages.length) {
      throw new Error("Invalid message index");
    }
    let updatedMessages: RemoveMessage[] = [];
    if (args.cascade) {
      updatedMessages = messages
        .slice(0, args.messageIndex)
        .map((message) => new RemoveMessage({ id: message.id! }));
    } else {
      updatedMessages = [
        new RemoveMessage({ id: messages[args.messageIndex].id! }),
      ];
    }

    return await agentGraph
      .compile({ checkpointer })
      .updateState(
        { configurable: { thread_id: args.chatId } },
        { messages: updatedMessages },
      );
  },
});

export const editMessage = internalAction({
  args: {
    chatId: v.id("chats"),
    messageIndex: v.number(),
    newContent: v.string(),
    cascade: v.boolean(),
  },
  handler: async (ctx, args) => {
    const checkpointer = new ConvexCheckpointSaver(ctx);
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: args.chatId },
    });
    const messages = checkpoint?.channel_values.messages as BaseMessage[];

    if (!messages) {
      throw new Error("No messages found in chat");
    }

    if (args.messageIndex < 0 || args.messageIndex >= messages.length) {
      throw new Error("Invalid message index");
    }

    const messageToEdit = messages[args.messageIndex];
    let updatedMessages: BaseMessage[] = [];

    // Create the edited message with the same ID to overwrite the original
    if (messageToEdit instanceof HumanMessage) {
      const editedMessage = new HumanMessage({
        content: args.newContent,
        id: messageToEdit.id,
      });
      updatedMessages.push(editedMessage);
    } else if (messageToEdit instanceof AIMessage) {
      const editedMessage = new AIMessage({
        content: args.newContent,
        id: messageToEdit.id,
      });
      updatedMessages.push(editedMessage);
    } else {
      throw new Error("Cannot edit this type of message");
    }

    // If cascade is true, remove all subsequent messages
    if (args.cascade) {
      const messagesToRemove = messages.slice(args.messageIndex + 1);
      const removeMessages = messagesToRemove.map(
        (message) => new RemoveMessage({ id: message.id! }),
      );
      updatedMessages.push(...removeMessages);
    }

    return await agentGraph
      .compile({ checkpointer })
      .updateState(
        { configurable: { thread_id: args.chatId } },
        { messages: updatedMessages },
      );
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

export const branchChat = internalAction({
  args: {
    chatInputDoc: ChatInputs.doc,
    chatDoc: Chats.doc,
    messageIndex: v.number(),
  },
  handler: async (ctx, args): Promise<Id<"chats">> => {
    const checkpointer = new ConvexCheckpointSaver(ctx);
    const sourceChatId = args.chatDoc._id;
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: sourceChatId },
    });
    const messages = checkpoint?.channel_values.messages as BaseMessage[];

    if (!messages) {
      throw new Error("No messages found in chat");
    }

    if (args.messageIndex < 0 || args.messageIndex >= messages.length) {
      throw new Error("Invalid message index");
    }

    const newChatId = await ctx.runMutation(api.chats.mutations.create, {
      name: `${args.chatDoc.name} (branch)`,
    });

    const branchedMessages = messages.slice(0, args.messageIndex + 1);

    const humanMessage = await createHumanMessage(ctx, args.chatInputDoc.text!, args.chatInputDoc.documents);

    const newChatMessages = [...branchedMessages, humanMessage];

    await agentGraph
      .compile({ checkpointer })
      .updateState(
        { configurable: { thread_id: newChatId } },
        { messages: newChatMessages },
      );

    await ctx.runMutation(api.chatInputs.mutations.update, {
      chatId: args.chatInputDoc.chatId,
      updates: { text: "", documents: [] },
    });

    return newChatId;
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

      await ctx.runMutation(api.chats.mutations.update, {
        chatId: args.chatInputDoc.chatId,
        updates: { name: response.title },
      });
    }
  },
});