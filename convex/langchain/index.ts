"use node";

import { z } from "zod";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import {
  RemoveMessage,
  BaseMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { api, internal } from "../_generated/api";
import { ConvexCheckpointSaver } from "../checkpointer/checkpointer";
import { agentGraph } from "./agent";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { getModel } from "./models";
import {
  createHumanMessage,
  processStreamWithBatching,
  streamHelper,
} from "./utils";
import type { Doc, Id } from "../_generated/dataModel";
import * as schema from "../schema";
import { FunctionReturnType } from "convex/server";

export async function chat(
  ctx: ActionCtx,
  args: Partial<Doc<"chatInputs">> & { chat: Doc<"chats"> | null },
) {
  const abortController = new AbortController();
  const stream = streamHelper(ctx, {
    chatInput: args,
    signal: abortController.signal,
    includeHumanMessage: true,
  });
  await processStreamWithBatching(ctx, stream, args.streamId!, abortController);
}

export async function removeMessageGroup(
  ctx: ActionCtx,
  args: {
    chatId: Id<"chats">;
    startIndex: number;
    count: number;
    cascade: boolean;
  },
) {
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
}

export async function regenerateResponse(
  ctx: ActionCtx,
  args: {
    chatId: Id<"chats">;
  },
) {
  const chatInput = await ctx.runQuery(
    internal.chatInputs.queries.getInternal,
    {
      chatId: args.chatId,
    },
  );

  // Create AbortController for cancellation
  const abortController = new AbortController();
  const stream = streamHelper(ctx, {
    chatInput,
    signal: abortController.signal,
    includeHumanMessage: false,
  });

  await processStreamWithBatching(
    ctx,
    stream,
    chatInput.streamId!,
    abortController,
  );
}

export async function addMessage(
  ctx: ActionCtx,
  args: {
    chatInputDoc: Doc<"chatInputs">;
  },
): Promise<Record<string, any>> {
  const checkpointer = new ConvexCheckpointSaver(ctx);
  const checkpoint = await checkpointer.get({
    configurable: { thread_id: args.chatInputDoc.chatId },
  });
  const messages = checkpoint?.channel_values.messages as BaseMessage[];

  if (!messages) {
    throw new Error("No messages found in chat");
  }

  const humanMessage = await createHumanMessage(
    ctx,
    args.chatInputDoc.text!,
    args.chatInputDoc.documents,
  );

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
}

export async function getMessageCount(
  ctx: ActionCtx,
  args: {
    chatId: Id<"chats">;
  },
) {
  const checkpointer = new ConvexCheckpointSaver(ctx);
  const checkpoint = await checkpointer.get({
    configurable: { thread_id: args.chatId },
  });
  const messages = checkpoint?.channel_values.messages as BaseMessage[];

  return {
    totalMessages: messages ? messages.length : 0,
  };
}

export const generateTitle = internalAction({
  args: schema.ChatInputs.doc,
  handler: async (ctx, args) => {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a helpful assistant that generates titles for chats.",
      ],
      new MessagesPlaceholder("input"),
    ]);
    const output = z.object({
      title: z.string(),
    });

    const modelWithOutputParser = prompt.pipe(
      await getModel("worker").withStructuredOutput(output),
    );

    if (args.chatId !== "new") {
      const response = await modelWithOutputParser.invoke({
        input: [await createHumanMessage(ctx, args.text!, [])],
      });

      await ctx.runMutation(internal.chats.crud.update, {
        id: args.chatId!,
        patch: { name: response.title, updatedAt: Date.now() },
      });
    }
  },
});

export async function editMessage(
  ctx: ActionCtx,
  args: {
    chatId: Id<"chats">;
    messageIndex: number;
    newContent: string;
    documents?: Id<"documents">[];
  },
) {
  const checkpointer = new ConvexCheckpointSaver(ctx);
  const checkpoint = await checkpointer.get({
    configurable: { thread_id: args.chatId },
  });
  const messages = checkpoint?.channel_values.messages as BaseMessage[];

  if (
    !messages ||
    args.messageIndex < 0 ||
    args.messageIndex >= messages.length
  ) {
    throw new Error("Invalid message index");
  }

  const messageToEdit = messages[args.messageIndex];

  if (!(messageToEdit instanceof HumanMessage)) {
    throw new Error("Only human messages can be edited");
  }

  // For human messages, create a new HumanMessage with updated content
  const updatedMessage = await createHumanMessage(
    ctx,
    args.newContent,
    args.documents,
  );
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
}

export async function branchFromMessage(
  ctx: ActionCtx,
  args: {
    chatId: Id<"chats">;
    chatInput: FunctionReturnType<typeof api.chatInputs.queries.get>;
    newChatId: Id<"chats">;
    messageIndex: number;
  },
) {
  const checkpointer = new ConvexCheckpointSaver(ctx);
  const checkpoint = await checkpointer.get({
    configurable: { thread_id: args.chatId },
  });
  const messages = checkpoint?.channel_values.messages as BaseMessage[];

  if (!messages || args.messageIndex < 0 || args.messageIndex > messages.length) {
    throw new Error("Invalid message index");
  }

  // Slice the messages up to the specified index
  const branchedMessages = messages.slice(0, args.messageIndex - 1);

  // Update the new chat's checkpoint with the branched messages
  if (branchedMessages.length > 0) {
    await agentGraph
      .compile({ checkpointer })
      .updateState(
        { configurable: { thread_id: args.newChatId, chatInput: args.chatInput } },
        { messages: branchedMessages },
      );
  }

  return { success: true };
}
