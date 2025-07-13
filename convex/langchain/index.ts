"use node";

import { z } from "zod";
import { action, internalAction } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { agentGraph } from "./agent";
import { api, internal } from "../_generated/api";
import {
  mapChatMessagesToStoredMessages,
  mapStoredMessageToChatMessage,
  type StoredMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { GraphState } from "./state";
import { v } from "convex/values";
import {
  buildMessageLookups,
  getThreadFromMessage,
} from "../chatMessages/helpers";
import { formatMessages, getModel } from "./models";
import { ChatMessages, Chats } from "../schema";

export interface AIChunkGroup {
  type: "ai";
  content: string;
  reasoning?: string;
}

export interface ToolChunkGroup {
  type: "tool";
  toolName: string;
  input?: unknown;
  output?: unknown;
  isComplete: boolean;
}

export const generateTitle = internalAction({
  args: v.object({
    chat: Chats.doc,
    message: ChatMessages.doc,
  }),
  handler: async (ctx, args) => {
    const firstMessage = await formatMessages(
      ctx,
      [
        mapStoredMessageToChatMessage(
          JSON.parse(args.message.message) as StoredMessage,
        ),
      ],
      args.chat.model,
    );
    const model = await getModel(ctx, "worker", undefined, args.chat.userId);
    const titleSchema = z.object({
      title: z
        .string()
        .describe("A short title for the chat. Keep it under 6 words."),
    });
    const structuredModel = model.withStructuredOutput(titleSchema);
    const title = (await structuredModel.invoke([
      new SystemMessage(
        "You are a title generator that generates a short title for the following user message.",
      ),
      ...firstMessage,
    ])) as z.infer<typeof titleSchema>;
    await ctx.runMutation(internal.chats.crud.update, {
      id: args.chat._id,
      patch: {
        name: title.title,
        updatedAt: Date.now(),
      },
    });
  },
});

export const chat = action({
  args: v.object({
    chatId: v.id("chats"),
  }),
  handler: async (ctx, args) => {
    const { chatId } = args;
    const prep = await ctx.runMutation(internal.langchain.utils.prepareChat, {
      chatId,
    });
    const { chat, message, messages, customPrompt } = prep!;
    const { messageMap } = buildMessageLookups(messages);
    const thread = getThreadFromMessage(message, messageMap);

    const checkpointer = new MemorySaver();
    const agent = agentGraph.compile({ checkpointer });

    const abort = new AbortController();
    const stream = agent.streamEvents(
      { messages: thread.map((m) => m.message) },
      {
        version: "v2",
        configurable: { ctx, chat, customPrompt, thread_id: chatId },
        recursionLimit: 30,
        signal: abort.signal,
      },
    );

    let buffer: string[] = [];
    let checkpoint: typeof GraphState.State | null = null;
    let finished = false;

    const flushAndStream = async (): Promise<
      typeof GraphState.State | null
    > => {
      let localCheckpoint: typeof GraphState.State | null = null;

      const flusher = async () => {
        while (!finished) {
          if (buffer.length > 0) {
            const chunks = buffer;
            buffer = [];
            await ctx.runMutation(internal.streams.mutations.flush, {
              chatId,
              chunks,
              completedSteps: [
                ...(localCheckpoint?.pastSteps?.map(
                  (pastStep) => pastStep[0],
                ) ?? []),
                ...(localCheckpoint?.plan && localCheckpoint.plan.length > 0
                  ? [
                    ...(Array.isArray(localCheckpoint.plan[0]) ?
                      localCheckpoint.plan[0].map((step) => step.step) :
                      [localCheckpoint.plan[0].step]),
                  ]
                  : []),
              ],
            });
          } else {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      };

      let lastToolInput: unknown | undefined = undefined;
      const streamer = async () => {
        try {
          for await (const evt of stream) {
            localCheckpoint = (
              await agent.getState({
                configurable: { thread_id: chatId },
              })
            ).values as typeof GraphState.State;

            const allowedNodes = ["baseAgent", "simple", "plannerAgent"];
            if (
              allowedNodes.some((node) =>
                evt.metadata?.checkpoint_ns?.startsWith(node),
              )
            ) {
              if (evt.event === "on_chat_model_stream") {
                buffer.push(
                  JSON.stringify({
                    type: "ai",
                    content: evt.data?.chunk?.content ?? "",
                    reasoning:
                      evt.data?.chunk?.additional_kwargs?.reasoning_content,
                  }),
                );
              } else if (evt.event === "on_tool_start") {
                lastToolInput = evt.data?.input;
                buffer.push(
                  JSON.stringify({
                    type: "tool",
                    toolName: evt.name,
                    input: evt.data?.input,
                    isComplete: false,
                  }),
                );
              } else if (evt.event === "on_tool_end") {
                let output = evt.data?.output.content;

                if (Array.isArray(output)) {
                  output = await Promise.all(
                    output.map(async (item: any) => {
                      if (
                        item.type === "image_url" &&
                        item.image_url &&
                        item.image_url.url
                      ) {
                        return {
                          type: "image_url",
                          image_url: {
                            url: "https://t3.chat/images/noise.png",
                          },
                        };
                      }
                      return item;
                    }),
                  );
                }

                buffer.push(
                  JSON.stringify({
                    type: "tool",
                    toolName: evt.name,
                    input: lastToolInput,
                    output,
                    isComplete: true,
                  }),
                );
              }
            }
          }
        } finally {
          finished = true;
        }
      };

      await Promise.all([flusher(), streamer()]);
      return localCheckpoint;
    };

    try {
      checkpoint = await flushAndStream();
    } catch (e) {
      if (abort.signal.aborted) {
        return;
      }
      await ctx.runMutation(internal.streams.mutations.update, {
        chatId,
        updates: {
          completedSteps: [],
          status: "error",
        },
      });
      throw e;
    }

    const newMessages = checkpoint?.messages?.slice(thread.length);
    if (newMessages?.length) {
      const parent: Id<"chatMessages"> | null = thread.length
        ? thread[thread.length - 1]._id
        : null;

      // Process all messages and prepare them for batch creation
      const messagesToCreate: Array<{
        message: string;
        parentId?: Id<"chatMessages">;
      }> = [];

      for (const m of newMessages) {
        let stored = mapChatMessagesToStoredMessages([m])[0];

        if (m instanceof ToolMessage && Array.isArray(m.content)) {
          const patched = await Promise.all(
            m.content.map(async (item) => {
              if (
                item.type === "image_url" &&
                item.image_url?.url?.startsWith("data:")
              ) {
                const [, mime, base64] =
                  item.image_url.url.match(/^data:(.+);base64,(.+)$/) ?? [];
                const blob = await (
                  await fetch(`data:${mime};base64,${base64}`)
                ).blob();
                const key = await ctx.storage.store(blob);
                const docId = await ctx.runMutation(
                  api.documents.mutations.create,
                  {
                    name: "Image Upload - " + new Date().toISOString(),
                    type: "file",
                    key,
                    size: blob.size,
                  },
                );
                return { type: "file", file: { file_id: docId } };
              }
              return item;
            }),
          );
          stored = {
            ...stored,
            data: { ...stored.data, content: JSON.stringify(patched) },
          };
        }

        messagesToCreate.push({
          message: JSON.stringify(stored),
          parentId: parent ?? undefined,
        });
      }

      // Create all messages in a single batch operation
      if (messagesToCreate.length > 0) {
        await ctx.runMutation(internal.chats.mutations.createRaw, {
          chatId,
          messages: messagesToCreate,
        });
      }
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      chatId,
      updates: { status: "done", completedSteps: [] },
    });
  },
});

export const regenerate = action({
  args: v.object({
    messageId: v.id("chatMessages"),
  }),
  handler: async (ctx, args) => {
    const message = await ctx.runQuery(internal.chatMessages.crud.read, {
      id: args.messageId,
    });
    if (!message) {
      throw new Error("Message not found");
    }
    await ctx.runMutation(internal.chatMessages.mutations.regenerate, {
      messageId: args.messageId,
    });
    await ctx.runAction(api.langchain.index.chat, {
      chatId: message.chatId,
    });
  },
});
