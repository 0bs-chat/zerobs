"use node";

import { action } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { agentGraph } from "./agent";
import { api, internal } from "../_generated/api";
import { mapStoredMessageToChatMessage } from "@langchain/core/messages";
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
    
    const messages = (await ctx.runQuery(api.chatMessages.queries.get, {
      chatId: args.chatId,
      getCurrentThread: true,
    })).map((message) => mapStoredMessageToChatMessage(JSON.parse(message.message)));

    const checkpointer = new MemorySaver();
    const agent = agentGraph.compile({ checkpointer });
    const stream = agent.streamEvents(
      { messages },
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
    
    if (!chat.streamId) {
      streamDoc = await ctx.runMutation(internal.streams.crud.create, {
        userId: chat.userId,
        status: "streaming",
      });
      await ctx.runMutation(api.chats.mutations.update, {
        chatId: args.chatId,
        updates: {
          streamId: streamDoc._id!,
        },
      });
      chat.streamId = streamDoc._id!;
    }

    try {
      for await (const event of stream) {
        const state = parseStateToStreamStatesDoc((await agent.getState({ configurable: { thread_id: args.chatId } })).values as typeof GraphState.State);

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
  }
});