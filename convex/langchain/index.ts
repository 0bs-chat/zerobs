"use node";

import { action } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { agentGraph } from "./agent";
import { api, internal } from "../_generated/api";
import { mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { parseStateToStreamStatesDoc } from "./helpers";
import { GraphState } from "./state";
import { v } from "convex/values";
import { getCurrentThread } from "../chatMessages/helpers";

export const chat = action({
  args: v.object({
    chatId: v.id("chats"),
  }),
  handler: async (ctx, args) => {
    let chat = await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });
    const abortController = new AbortController();
    const project = chat.projectId 
      ? await ctx.runQuery(api.projects.queries.get, { 
          projectId: chat.projectId 
        })
      : null;
    const customPrompt = project?.systemPrompt && project.systemPrompt.trim() !== "" 
      ? project.systemPrompt 
      : undefined;
    
    const messages = await ctx.runQuery(api.chatMessages.queries.get, {
      chatId: args.chatId,
    })
    const currentThread = getCurrentThread(messages);
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
      }
    );

    const BUFFER = 300; // ms
    let lastFlush = Date.now();
    const buffer: string[] = [];
    let wasCancelled = false;
    let streamDoc = await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });
    let checkpoint: typeof GraphState.State | null = null;
    
    if (!streamDoc) {
      streamDoc = await ctx.runMutation(internal.streams.crud.create, {
        userId: chat.userId,
        status: "pending",
        chatId: args.chatId,
      });
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      chatId: args.chatId,
      updates: {
        status: "pending",
      },
    });

    try {
      for await (const event of stream) {
        checkpoint = (await agent.getState({ configurable: { thread_id: args.chatId } })).values as typeof GraphState.State
        const state = parseStateToStreamStatesDoc(checkpoint);

        await ctx.runMutation(internal.streams.mutations.updateState, {
          chatId: args.chatId,
          updates: state,
        });

        if (streamDoc?.status === "cancelled") {
          wasCancelled = true;
          abortController.abort();
          break;
        }

        if (
          ["on_chat_model_stream", "on_tool_start", "on_tool_end"].includes(
            event.event,
          )
        ) {
          const allowedNodes = ["baseAgent", "simple"];
          if (
            allowedNodes.some((node) =>
              event.metadata.checkpoint_ns.startsWith(node),
            )
          ) {
            buffer.push(JSON.stringify(event));
          }
        }

        const now = Date.now();
        if (now - lastFlush >= BUFFER) {
          if (streamDoc) {
            streamDoc = await ctx.runMutation(
              internal.streams.mutations.appendChunks,
              {
                chatId: args.chatId,
                chunks: buffer,
              },
            );
          }
          lastFlush = now;
          buffer.length = 0;
        }
      }
    } catch (error) {
      if (wasCancelled) {
        return;
      }
      if (streamDoc) {
        await ctx.runMutation(internal.streams.mutations.update, {
          chatId: args.chatId,
          updates: {
            status: "error",
          },
        });
      }
      throw error;
    }

    const newMessages = checkpoint?.messages?.slice(messages.length, checkpoint.messages.length);
    if (newMessages) {
      let parentId: Id<"chatMessages"> | null = messages.length > 0 ? messages[messages.length - 1]._id : null;
      for (const message of newMessages) {
        const newMessageDoc: Doc<"chatMessages"> = await ctx.runMutation(internal.chatMessages.crud.create, {
          chatId: args.chatId,
          parentId: parentId,
          message: JSON.stringify(mapChatMessagesToStoredMessages([message])[0]),
        });
        parentId = newMessageDoc._id;
      }
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      chatId: args.chatId,
      updates: {
        status: wasCancelled ? "cancelled" : "done",
      },
    });
  }
});