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
    const model = await getModel(ctx, "worker", undefined);
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
    let chat = await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    let streamDoc = await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });
    if (["pending", "streaming"].includes(streamDoc?.status ?? "")) {
      return;
    }

    const abortController = new AbortController();
    const project = chat.projectId
      ? await ctx.runQuery(api.projects.queries.get, {
          projectId: chat.projectId,
        })
      : null;

    const customPrompt =
      project?.systemPrompt && project.systemPrompt.trim() !== ""
        ? project.systemPrompt
        : undefined;

    const messages = await ctx.runQuery(api.chatMessages.queries.get, {
      chatId: args.chatId,
    });

    if (messages?.length === 1) {
      ctx.runAction(internal.langchain.index.generateTitle, {
        chat: chat,
        message: messages[0],
      });
    }

    const message = messages.slice(-1)[0];
    if (!message) {
      throw new Error("Message not found");
    }
    const { messageMap } = buildMessageLookups(messages);
    const currentThread = getThreadFromMessage(message, messageMap);

    const checkpointer = new MemorySaver();
    const agent = agentGraph.compile({ checkpointer });

    const stream = agent.streamEvents(
      { messages: currentThread.map((message) => message.message) },
      {
        version: "v2",
        configurable: {
          ctx,
          chat: chat,
          customPrompt,
          thread_id: args.chatId,
        },
        recursionLimit: 100,
        signal: abortController.signal,
      },
    );

    const BUFFER = 300; // ms
    let buffer: string[] = [];
    let wasCancelled = false;
    let streamCompleted = false;
    let checkpoint: typeof GraphState.State | null = null;

    if (!streamDoc) {
      streamDoc = await ctx.runMutation(internal.streams.crud.create, {
        userId: chat.userId,
        status: "pending",
        chatId: args.chatId,
        completedSteps: [],
      });
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      chatId: args.chatId,
      updates: {
        status: "pending",
      },
    });

    // Create a function to handle flushing chunks
    async function flushChunks() {
      while (
        !wasCancelled &&
        !streamCompleted &&
        !abortController.signal.aborted
      ) {
        await new Promise((resolve) => setTimeout(resolve, BUFFER));

        if (buffer.length > 0) {
          const chunksToFlush = buffer;
          buffer = [];

          try {
            streamDoc = await ctx.runMutation(
              internal.streams.mutations.appendChunks,
              {
                chatId: args.chatId,
                chunks: chunksToFlush,
              },
            );

            // Check if the stream was cancelled during appendChunks
            if (streamDoc.status === "cancelled") {
              wasCancelled = true;
              abortController.abort();
              break;
            }
          } catch (error) {
            // If mutation fails due to cancellation, stop flushing
            if (abortController.signal.aborted) {
              break;
            }
            throw error;
          }
        }
      }

      // Only flush remaining buffer if not cancelled
      if (
        buffer.length > 0 &&
        !wasCancelled &&
        !abortController.signal.aborted
      ) {
        const chunksToFlush = buffer;
        buffer = [];

        try {
          await ctx.runMutation(internal.streams.mutations.appendChunks, {
            chatId: args.chatId,
            chunks: chunksToFlush,
          });
        } catch (error) {
          // Ignore errors if already cancelled
          if (!abortController.signal.aborted) {
            throw error;
          }
        }
      }
    }

    // Start the flush loop in parallel
    const flushPromise = flushChunks();

    try {
      for await (const event of stream) {
        // Check for cancellation early and often
        if (abortController.signal.aborted) {
          wasCancelled = true;
          break;
        }

        // Refresh stream doc to check for cancellation
        const currentStreamDoc = await ctx.runQuery(api.streams.queries.get, {
          chatId: args.chatId,
        });

        if (currentStreamDoc?.status === "cancelled") {
          wasCancelled = true;
          abortController.abort();
          break;
        }

        const currentCheckpoint = (
          await agent.getState({ configurable: { thread_id: args.chatId } })
        ).values as typeof GraphState.State;
        if (
          checkpoint === null ||
          currentCheckpoint.messages?.length !== checkpoint.messages?.length ||
          currentCheckpoint.plan?.length !== checkpoint.plan?.length ||
          currentCheckpoint.pastSteps?.length !== checkpoint.pastSteps?.length
        ) {
          checkpoint = currentCheckpoint;

          // Check for cancellation before making mutations
          if (!wasCancelled && !abortController.signal.aborted) {
            try {
              await ctx.runMutation(internal.streams.mutations.update, {
                chatId: args.chatId,
                updates: {
                  completedSteps:
                    currentCheckpoint?.pastSteps?.length > 0
                      ? currentCheckpoint.pastSteps.map((pastStep) => {
                          const [step, _messages] = pastStep;
                          return step as string;
                        })
                      : currentCheckpoint?.plan?.length > 0
                        ? [currentCheckpoint.plan.flat()[0]]
                        : undefined,
                },
              });
            } catch (error) {
              // If mutation fails, check if it's due to cancellation
              if (!abortController.signal.aborted) {
                throw error;
              }
              break;
            }
          }
        }

        if (
          ["on_chat_model_stream", "on_tool_start", "on_tool_end"].includes(
            event.event,
          )
        ) {
          const allowedNodes = ["baseAgent", "simple", "plannerAgent"];
          if (
            allowedNodes.some((node) =>
              event.metadata.checkpoint_ns.startsWith(node),
            )
          ) {
            // Check for cancellation before processing events
            if (wasCancelled || abortController.signal.aborted) {
              break;
            }

            // Minify the data before sending it to the frontend to reduce bandwidth.
            if (event.event === "on_chat_model_stream") {
              const content = event.data?.chunk?.content ?? "";
              const reasoning =
                event.data?.chunk?.additional_kwargs?.reasoning_content ?? "";

              const aiChunk: AIChunkGroup = {
                type: "ai",
                content,
                ...(reasoning ? { reasoning } : {}),
              };

              buffer.push(JSON.stringify(aiChunk));
            } else if (event.event === "on_tool_start") {
              const toolChunk: ToolChunkGroup = {
                type: "tool",
                toolName: event.name ?? "Tool",
                input: JSON.stringify(event.data?.input),
                isComplete: false,
              } as ToolChunkGroup;

              buffer.push(JSON.stringify(toolChunk));
            } else if (event.event === "on_tool_end") {
              const outputContent = event.data?.output.content;
              let processedOutput = outputContent;

              if (Array.isArray(outputContent)) {
                processedOutput = await Promise.all(
                  outputContent.map(async (item) => {
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

              const toolChunk: ToolChunkGroup = {
                type: "tool",
                toolName: event.name ?? "Tool",
                output: processedOutput,
                isComplete: true,
              } as ToolChunkGroup;

              buffer.push(JSON.stringify(toolChunk));
            }
          }
        }
      }
      streamCompleted = true;
    } catch (error) {
      wasCancelled = true;
      abortController.abort();

      // If already cancelled/aborted, don't throw
      if (abortController.signal.aborted) {
        return;
      }

      // Only update status if not already cancelled
      try {
        const currentStreamDoc = await ctx.runQuery(api.streams.queries.get, {
          chatId: args.chatId,
        });

        if (currentStreamDoc && currentStreamDoc.status !== "cancelled") {
          await ctx.runMutation(internal.streams.mutations.update, {
            chatId: args.chatId,
            updates: {
              completedSteps: [],
              status: "error",
            },
          });
        }
      } catch (updateError) {
        // Ignore update errors if we're already in an error state
        console.error("Failed to update stream status:", updateError);
      }

      throw error;
    } finally {
      // Signal completion to stop the flush loop
      streamCompleted = true;

      // Wait for any remaining chunks to be flushed
      try {
        await flushPromise;
      } catch (flushError) {
        // Ignore flush errors during cleanup
        console.error("Error during flush cleanup:", flushError);
      }
    }

    const newMessages = checkpoint?.messages?.slice(
      currentThread.length,
      checkpoint.messages.length,
    );
    if (newMessages) {
      let parentId: Id<"chatMessages"> | null =
        currentThread.length > 0
          ? currentThread[currentThread.length - 1]._id
          : null;
      for (const message of newMessages) {
        let newMessage = mapChatMessagesToStoredMessages([message])[0];
        if (message instanceof ToolMessage && Array.isArray(message.content)) {
          const newContent = await Promise.all(
            message.content.map(async (content) => {
              if (
                typeof content === "object" &&
                content?.type === "image_url" &&
                content.image_url?.url
              ) {
                const matches = content.image_url.url.match(
                  /^data:(.+);base64,(.+)$/,
                );
                if (matches) {
                  const mimeType = matches[1];
                  const base64 = matches[2];
                  const blob = await (
                    await fetch(`data:${mimeType};base64,${base64}`)
                  ).blob();
                  const storageId = await ctx.storage.store(blob);
                  const documentId = await ctx.runMutation(
                    api.documents.mutations.create,
                    {
                      name: "Image Upload - " + new Date().toISOString(),
                      type: "file",
                      key: storageId,
                      size: blob.size,
                    },
                  );
                  return {
                    type: "file",
                    file: {
                      file_id: documentId,
                    },
                  };
                }
              }
              return content;
            }),
          );

          newMessage = {
            ...newMessage,
            data: {
              ...newMessage.data,
              content: JSON.stringify(newContent),
            },
          };
        }

        const newMessageDoc: Doc<"chatMessages"> = await ctx.runMutation(
          internal.chatMessages.crud.create,
          {
            chatId: args.chatId,
            parentId: parentId,
            message: JSON.stringify(newMessage),
          },
        );
        parentId = newMessageDoc._id;
      }
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      chatId: args.chatId,
      updates: {
        completedSteps: [],
        status: wasCancelled ? "cancelled" : "done",
      },
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