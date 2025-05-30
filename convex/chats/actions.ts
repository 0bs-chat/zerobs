import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, httpAction } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";

export const send = action({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    const chatInput = await ctx.runQuery(api.chatInput.queries.get, {
      chatId: args.chatId,
    });

    if (!chatInput.text) {
      throw new Error("Chat input not found");
    }

    if (!chatInput.model) {
      throw new Error("Model not found");
    }

    const stream = await ctx.runMutation(internal.streams.crud.create, {
      userId: chatInput.userId!,
      status: "pending",
    });
    await ctx.runMutation(api.chatInput.mutations.update, {
      chatId: args.chatId,
      updates: {
        streamId: stream._id,
      },
    });

    await ctx.runAction(internal.langchain.index.chat, {
      chatInputId: chatInput._id as Id<"chatInput">,
    });

    return null;
  },
});

export const stream = httpAction(async (ctx, req) => {
  await requireAuth(ctx);

  const res = await req.json() as {
    streamId: Id<"streams">;
    lastChunkTime: number;
  };
  const streamId = res.streamId;
  let now = res.lastChunkTime || Date.now();

  const stream = await ctx.runQuery(api.streams.queries.get, {
    streamId: streamId,
  });

  const { readable, writable } = new TransformStream();
  let writer = writable.getWriter() as WritableStreamDefaultWriter<Uint8Array> | null;
  const textEncoder = new TextEncoder();

  const buffer = 100;
  while (true) {
    const newChunks = await ctx.runQuery(api.streams.queries.getNewChunks, {
      streamId: streamId,
      lastChunkTime: now,
    });

    for (const chunk of newChunks.chunks) {
      writer?.write(textEncoder.encode(chunk.chunk));
    }
    now = newChunks.chunks[newChunks.chunks.length - 1]._creationTime;

    if (["done", "error"].includes(newChunks.stream.status)) {
      break;
    }

    console.log("newChunks", JSON.stringify(newChunks, null, 2));

    await new Promise((resolve) => setTimeout(resolve, buffer));
  }

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Vary": "Origin",
      "Access-Control-Allow-Origin": "*",
    },
  });
});