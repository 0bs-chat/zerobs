"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
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
    const stream = await streamHelper(ctx, { chatInput });

    // ---- new batching logic ----
    const streamId = chatInput.streamId!;
    const BUFFER_FLUSH_DELAY = 300; // ms
    let lastFlush = Date.now();
    const buffer: string[] = [];

    try {
      for await (const event of stream) {
        // collect
        buffer.push(JSON.stringify(event));

        // if it's been >100ms since last flush, send a batch
        if (Date.now() - lastFlush >= BUFFER_FLUSH_DELAY) {
          await ctx.runMutation(
            internal.streams.mutations.appendChunks,
            {
              streamId,
              chunks: buffer.splice(0, buffer.length),
            }
          );
          lastFlush = Date.now();
        }
      }

      if (buffer.length > 0) {
        await ctx.runMutation(
          internal.streams.mutations.appendChunks,
          {
            streamId,
            chunks: buffer.splice(0, buffer.length),
          }
        );
      }
      
      await ctx.runMutation(
        internal.streams.mutations.update,
        {
          streamId,
          updates: { status: "done" },
        }
      );
    } catch (error) {
      console.error(error);
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
  args: { chatInput: Doc<"chatInputs"> }
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
  const response = agentGraph
    .compile({ checkpointer })
    .streamEvents(
      { messages: [humanMessage] },
      {
        version: "v2",
        configurable: {
          ctx,
          chatInput: args.chatInput,
          thread_id: args.chatInput.chatId,
        },
        recursionLimit: 100,
      }
    );

  for await (const event of response) {
    yield event;
  }
}

export const getState = internalAction({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const checkpointer = new ConvexCheckpointSaver(ctx);
    const agent = agentGraph.compile({ checkpointer });
    return JSON.stringify(
      await agent.getState({ configurable: { thread_id: args.chatId } })
    );
  },
});