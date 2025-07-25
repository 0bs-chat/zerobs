"use node";

import { z } from "zod";
import { action, internalAction } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
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
import type { GraphState, AIChunkGroup, ToolChunkGroup } from "./state";
import { v } from "convex/values";
import { getThreadFromMessage } from "../chatMessages/helpers";
import { formatMessages, getModel } from "./models";
import { ChatMessages, Chats } from "../schema";

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
    model: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { chatId } = args;
    const prep = await ctx.runMutation(internal.langchain.utils.prepareChat, {
      chatId,
      model: args.model,
    });
    const { chat, message, messages, customPrompt } = prep!;
    const thread = getThreadFromMessage(message, messages);

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

    let streamDoc: Doc<"streams"> | null = null;
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
            streamDoc = await ctx.runMutation(
              internal.streams.mutations.flush,
              {
                chatId,
                chunks,
                completedSteps: [
                  ...(localCheckpoint?.pastSteps?.map(
                    (pastStep) => pastStep[0],
                  ) ?? []),
                  ...(localCheckpoint?.plan && localCheckpoint.plan.length > 0
                    ? [
                        ...(localCheckpoint.plan[0].type === "parallel"
                          ? localCheckpoint.plan[0].data.map(
                              (step) => step.step,
                            )
                          : [localCheckpoint.plan[0].data.step]),
                      ]
                    : []),
                ],
              },
            );
          }
          if (streamDoc?.status === "cancelled") {
            abort.abort();
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      };

      const streamer = async () => {
        try {
          for await (const evt of stream) {
            if (abort.signal.aborted) {
              return;
            }
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
                  } as AIChunkGroup),
                );
              } else if (evt.event === "on_tool_start") {
                buffer.push(
                  JSON.stringify({
                    type: "tool",
                    toolName: evt.name,
                    input: evt.data?.input,
                    isComplete: false,
                    toolCallId: evt.run_id,
                  } as ToolChunkGroup),
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
                    input: evt.data?.input,
                    output,
                    isComplete: true,
                    toolCallId: evt.run_id,
                  } as ToolChunkGroup),
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
    model: v.optional(v.string()),
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
      model: args.model,
    });
  },
});

export const branchChat = action({
  args: v.object({
    chatId: v.id("chats"),
    branchFrom: v.id("chatMessages"),
    model: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ newChatId: Id<"chats"> }> => {
    const chatDoc = await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const newChatId = await ctx.runMutation(api.chats.mutations.create, {
      name: `Branched: ${chatDoc.name}`,
      model: args.model ?? chatDoc.model,
      reasoningEffort: chatDoc.reasoningEffort,
      projectId: chatDoc.projectId,
      conductorMode: chatDoc.conductorMode,
      orchestratorMode: chatDoc.orchestratorMode,
      webSearch: chatDoc.webSearch,
      artifacts: chatDoc.artifacts,
    });

    const allMessages = await ctx.runQuery(api.chatMessages.queries.get, {
      chatId: args.chatId,
    });

    const branchFromMessage = allMessages.find(
      (m) => m._id === args.branchFrom,
    );
    if (!branchFromMessage) {
      throw new Error("Branch message not found");
    }

    const thread = getThreadFromMessage(branchFromMessage, allMessages);

    const lastMessage = thread.at(-1);
    if (lastMessage) {
      const storedMessage = mapChatMessagesToStoredMessages([
        lastMessage.message,
      ])[0];
      if (storedMessage.type === "ai") {
        thread.pop();
      }
    }

    if (thread.length > 0) {
      await ctx.runMutation(internal.chats.mutations.createRaw, {
        chatId: newChatId,
        messages: thread.map((m) => ({
          message: JSON.stringify(
            mapChatMessagesToStoredMessages([m.message])[0],
          ),
        })),
      });
    }

    await ctx.runAction(api.langchain.index.chat, {
      chatId: newChatId,
      model: args.model,
    });

    return { newChatId };
  },
});
