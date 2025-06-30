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
      getCurrentThread: true,
    })
    const previousMessages = messages.map((message) => mapStoredMessageToChatMessage(JSON.parse(message.message)));

    const checkpointer = new MemorySaver();
    const agent = agentGraph.compile({ checkpointer });
    const stream = agent.streamEvents(
      { messages: previousMessages },
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
    let streamDoc: Doc<"streams"> | null = null;
    let checkpoint: typeof GraphState.State | null = null;
    
    if (!chat.streamId) {
      streamDoc = await ctx.runMutation(internal.streams.crud.create, {
        userId: chat.userId,
        status: "pending",
      });
      await ctx.runMutation(api.chats.mutations.update, {
        chatId: args.chatId,
        updates: {
          streamId: streamDoc._id!,
        },
      });
      chat.streamId = streamDoc._id!;
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      streamId: chat.streamId!,
      updates: {
        status: "pending",
      },
    });

    try {
      for await (const event of stream) {
        checkpoint = (await agent.getState({ configurable: { thread_id: args.chatId } })).values as typeof GraphState.State
        const state = parseStateToStreamStatesDoc(checkpoint);

        await ctx.runMutation(internal.streams.mutations.updateState, {
          streamId: chat.streamId!,
          updates: state,
        });

        const now = Date.now();
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

        if (now - lastFlush >= BUFFER) {
          if (chat.streamId) {
            streamDoc = await ctx.runMutation(
              internal.streams.mutations.appendChunks,
              {
                streamId: chat.streamId,
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
      if (chat.streamId) {
        await ctx.runMutation(internal.streams.mutations.update, {
          streamId: chat.streamId,
          updates: {
            status: "error",
          },
        });
      }
      throw error;
    }

    const newMessages = checkpoint?.messages?.slice(previousMessages.length, checkpoint.messages.length);
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
      streamId: chat.streamId!,
      updates: {
        status: "done",
      },
    });
  }
});