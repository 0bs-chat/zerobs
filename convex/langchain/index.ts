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
  args: v.object({ chatId: v.id("chats") }),
  handler: async (ctx, { chatId }) => {
    const prep = await ctx.runMutation(
      internal.langchain.utils.prepareChat,
      { chatId }
    );
    const { chat, message, messages, customPrompt } = prep!;
    const { messageMap } = buildMessageLookups(messages);
    const thread = getThreadFromMessage(message, messageMap);

    const checkpointer = new MemorySaver();
    const agent = agentGraph.compile({ checkpointer });

    const abort = new AbortController();
    const stream = agent.streamEvents(
      { messages: thread.map(m => m.message) },
      {
        version: "v2",
        configurable: { ctx, chat, customPrompt, thread_id: chatId },
        recursionLimit: 30,
        signal: abort.signal,
      }
    );

    let buffer: string[] = [];
    let checkpoint: typeof GraphState.State | null = null;
    let lastFlushCheckpoint: typeof GraphState.State | null = null;
    let finished = false;
    const flush = async () => {
      while (true) {
        if (finished) break;
        if (!buffer.length && !checkpoint) {
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        const chunks = buffer
        buffer = [];
        const currentCheckpoint = checkpoint;
        const isSameCheckpoint = lastFlushCheckpoint && currentCheckpoint &&
          lastFlushCheckpoint.pastSteps.length === currentCheckpoint.pastSteps.length &&
          lastFlushCheckpoint.pastSteps.every(([s], i) => s === currentCheckpoint.pastSteps[i][0]);
        lastFlushCheckpoint = currentCheckpoint;

        await ctx
          .runMutation(internal.streams.mutations.flush, {
            chatId,
            chunks,
            ...(isSameCheckpoint ? {} : {
              completedSteps:
                currentCheckpoint!.pastSteps?.length > 0
                  ? currentCheckpoint!.pastSteps.map((pastStep) => {
                      const [step, _messages] = pastStep;
                      return step as string;
                    })
                  : currentCheckpoint!.plan?.length > 0
                    ? [currentCheckpoint!.plan.flat()[0]]
                    : undefined,
            }),
          })
      }
    };
    flush();

    let lastToolInput: unknown | undefined = undefined;
    try {
      for await (const evt of stream) {
        checkpoint = (
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
              })
            );
          } else if (evt.event === "on_tool_start") {
            lastToolInput = evt.data?.input;
            buffer.push(
              JSON.stringify({
                type: "tool",
                toolName: evt.name,
                input: evt.data?.input,
                isComplete: false,
              })
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
                })
              );
            }

            buffer.push(
              JSON.stringify({
                type: "tool",
                toolName: evt.name,
                input: lastToolInput,
                output,
                isComplete: true,
              })
            );
          }
        }
      }
    } catch (e) {
      // If already cancelled/aborted, don't throw
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

    finished = true;

    const newMessages = checkpoint?.messages?.slice(thread.length);
    if (newMessages?.length) {
      let parent: Id<"chatMessages"> | null =
        thread.length ? thread[thread.length - 1]._id : null;

      for (const m of newMessages) {
        let stored = mapChatMessagesToStoredMessages([m])[0];

        if (m instanceof ToolMessage && Array.isArray(m.content)) {
          const patched = await Promise.all(
            m.content.map(async item => {
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
                  }
                );
                return { type: "file", file: { file_id: docId } };
              }
              return item;
            })
          );
          stored = {
            ...stored,
            data: { ...stored.data, content: JSON.stringify(patched) },
          };
        }

        const created: Doc<"chatMessages"> = await ctx.runMutation(
          internal.chatMessages.crud.createInternal,
          {
            chatId,
            parentId: parent,
            message: JSON.stringify(stored),
          }
        );
        parent = created._id;
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