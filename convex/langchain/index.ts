"use node";

import { ActionCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { agentGraph } from "./agent";
import { api, internal } from "../_generated/api";
import { mapStoredMessageToChatMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { parseStateToStreamStatesDoc } from "./helpers";
import { GraphState } from "./state";

export async function chat(
  ctx: ActionCtx,
  args: {
    chat: Doc<"chats">;
  },
) {
  const abortController = new AbortController();
  const project = args.chat.projectId 
    ? await ctx.runQuery(api.projects.queries.get, { 
        projectId: args.chat.projectId 
      })
    : null;
  const customPrompt = project?.systemPrompt && project.systemPrompt.trim() !== "" 
    ? project.systemPrompt 
    : undefined;
  
  const messages = (await ctx.runQuery(api.chats.queries.getMessages, {
    chatId: args.chat._id,
    paginationOpts: {
      numItems: 100,
      cursor: null,
    },
  })).page.map((message) => mapStoredMessageToChatMessage(JSON.parse(message.message)));
  
  const checkpointer = new MemorySaver();
  const agent = agentGraph.compile({ checkpointer });
  const stream = agent.streamEvents(
    { messages },
    { 
      version: "v2",
      configurable: { 
        ctx, 
        chat: args.chat,
        customPrompt,
        thread_id: args.chat._id,
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

  try {
    for await (const event of stream) {
      const state = parseStateToStreamStatesDoc((await agent.getState({ configurable: { thread_id: args.chat._id } })).values as typeof GraphState.State);
      await ctx.runMutation(internal.streams.mutations.updateState, {
        streamId: args.chat.streamId!,
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
        streamDoc = await ctx.runMutation(
          internal.streams.mutations.appendChunks,
          {
            streamId: args.chat.streamId!,
            chunks: buffer,
          },
        );
        lastFlush = now;
        buffer.length = 0;
      }
    }
  } catch (error) {
    if (wasCancelled) {
      return;
    }
    await ctx.runMutation(internal.streams.mutations.update, {
      streamId: args.chat.streamId!,
      updates: {
        status: "error",
      },
    });
    throw error;
  }
}