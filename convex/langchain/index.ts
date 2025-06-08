"use node";

import mime from "mime";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { DataContentBlock, HumanMessage, MessageContentComplex } from "@langchain/core/messages";
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
    const BUFFER_FLUSH_DELAY = 100; // ms
    let lastFlush = Date.now();
    const buffer: string[] = [];

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

    // flush any remaining events
    if (buffer.length > 0) {
      await ctx.runMutation(
        internal.streams.mutations.appendChunks,
        {
          streamId,
          chunks: buffer.splice(0, buffer.length),
        }
      );
    }
    // ---- end batching logic ----

    // finally mark the stream done
    await ctx.runMutation(
      internal.streams.mutations.update,
      {
        streamId,
        updates: { status: "done" },
      }
    );
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

        let docContent: MessageContentComplex | DataContentBlock;
        if (document.type === "file") {
          const url = await ctx.storage.getUrl(document.key);
          const mimeType = mime.getType(document.name) ?? "application/octet-stream";
          const fileType = mimeType.split("/")[0];

          if (fileType === "image") {
            docContent = {
              type: "image_url",
              image_url: {
                url: url,
                format: mimeType,
                detail: "high",
              },
            };
          } else if (["audio", "video"].includes(fileType) || mimeType === "application/pdf") {
            docContent = {
              type: "image_url",
              image_url: {
                url: url,
                format: mimeType,
              },
            };
          } else {
            docContent = await getVectorText(ctx, document);
          }
        } else if (document.type === "text") {
          docContent = {
            type: "text",
            text: `# ${document.name}\n${await (await ctx.storage.get(document.key))?.text()}\n`,
          };
        } else {
          docContent = await getVectorText(ctx, document);
        }
        return docContent;
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
      }
    );

  for await (const event of response) {
    yield event;
  }
}

export async function getVectorText(ctx: ActionCtx, document: Doc<"documents">): Promise<MessageContentComplex | DataContentBlock> {
  // Fall back to vector processing for unsupported file types
  let doc = document;
  let maxAttempts = 50;
  while (doc.status === "processing" && maxAttempts > 0) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    doc = await ctx.runQuery(api.documents.queries.get, {
      documentId: document._id,
    });
    maxAttempts--;
  }
  const vectors = await ctx.runQuery(internal.documents.queries.getAllVectors, {
    documentId: doc._id,
  });
  const text = vectors.length > 0 ? vectors.map((vector) => vector.text).join("\n") : "No text found";
  return {
    type: "text",
    text: `# ${doc.name}\n${text}\n`,
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