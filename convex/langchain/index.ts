"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { agentGraph } from "./agent";
import type { ActionCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { HumanMessage } from "@langchain/core/messages";
import { formatDocument } from "./models";
import { api, internal } from "../_generated/api";
import { createConvexCheckpointer } from "../checkpointer/checkpointer";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"

const pgcheckpointer = PostgresSaver.fromConnString(
  "postgresql://db_owner:npg_smWExcVX64oB@ep-steep-hat-a6146p9t-pooler.us-west-2.aws.neon.tech/db?sslmode=require"
);
await pgcheckpointer.setup();

export const chat = internalAction({
  args: {
    chatInputId: v.id("chatInput"),
  },
  handler: async (ctx, args) => {
    const chatInput = await ctx.runQuery(api.chatInput.queries.getById, {
      chatInputId: args.chatInputId,
    });
    const stream = await streamHelper(ctx, { chatInput });

    for await (const event of stream) {
      await ctx.runMutation(internal.streams.mutations.appendStream, {
        streamId: chatInput.streamId!,
        chunk: JSON.stringify(event),
      });
    }
  },
});

async function* streamHelper(
  ctx: ActionCtx,
  args: {
    chatInput: Doc<"chatInput">;
  }
) {
  const humanMessage = new HumanMessage({
    content: [
      {
        type: "text",
        source_type: "text",
        text: args.chatInput.text,
      },
      ...(args.chatInput.documents?.map(async (documentId) => {
        const document = await ctx.runQuery(api.documents.queries.get, {
          documentId: documentId,
        });
        return formatDocument(document, args.chatInput.model!, ctx);
      }) ?? []),
    ],
  });
  
  await ctx.runMutation(api.chatInput.mutations.update, {
    updates: {
      text: "",
      documents: [],
    },
    chatId: args.chatInput.chatId,
  });

  const checkpointer = createConvexCheckpointer(ctx);
  const response = (agentGraph.compile({ checkpointer: checkpointer })).streamEvents(
    {
      messages: [humanMessage],
    },
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

export const getState = internalAction({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const checkpointer = createConvexCheckpointer(ctx);
    const agent = agentGraph.compile({ checkpointer: checkpointer });
    return JSON.stringify(await agent.getState({ configurable: { thread_id: args.chatId } }))
  },
});