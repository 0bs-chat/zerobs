"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { HumanMessage } from "@langchain/core/messages";
import { api, internal } from "../_generated/api";
import { ConvexCheckpointSaver } from "../checkpointer/checkpointer";
import { agentGraph } from "./agent";

export const chat = internalAction({
  args: {
    chatInputId: v.id("chatInputs"),
  },
  handler: async (ctx, args) => {
    const chatInput = await ctx.runQuery(
      internal.chatInputs.queries.getById,
      { chatInputId: args.chatInputId }
    );    
    let streamDoc: Doc<"streams"> | null = null;
    
    // Create AbortController for cancellation
    const abortController = new AbortController();
    const stream = await streamHelper(ctx, { chatInput, signal: abortController.signal });

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
            }
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
          }
        );
        
        // Final check after flushing remaining buffer
        if (streamDoc.status === "cancelled") {
          wasCancelled = true;
        }
      }
      
      // Only mark as done if not cancelled
      if (!wasCancelled) {
        await ctx.runMutation(
          internal.streams.mutations.update,
          {
            streamId,
            updates: { status: "done" },
          }
        );
      }
    } catch (error) {
      console.error(error);
      
      // If we already know it was cancelled, don't override the status
      if (wasCancelled) {
        return;
      }
      
      // Check if the error was due to cancellation
      const errorStatus = streamDoc?.status || (await ctx.runQuery(api.streams.queries.get, { streamId })).status;
      
      if (errorStatus === "cancelled") {
        return;
      }
      
      await ctx.runMutation(
        internal.streams.mutations.update,
        {
          streamId,
          updates: { status: "error" },
        }
      );
    }
  },
});

async function* streamHelper(
  ctx: ActionCtx,
  args: { chatInput: Doc<"chatInputs">; signal?: AbortSignal }
) {
  const humanMessage = new HumanMessage({
    content: [
      {
        type: "text",
        text: args.chatInput.text,
      },
      ...(await Promise.all(args.chatInput.documents?.map(async (documentId) => {
        let document = await ctx.runQuery(api.documents.queries.get, {
          documentId,
        });
        
        return {
          type: "file",
          file: {
            file_id: document._id
          }
        }
      }) ?? [])),
    ],
  });

  await ctx.runMutation(api.chatInputs.mutations.update, {
    chatId: args.chatInput.chatId,
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
    .streamEvents(
      { messages: [humanMessage] },
      streamConfig
    );

  for await (const event of response) {
    if (["on_chat_model_stream", "on_tool_start", "on_tool_end"].includes(event.event)) {
      if (!["retrieve", "planner"].includes(event.metadata.langgraph_node)) {
        yield event; 
      }
    }
  }
}
