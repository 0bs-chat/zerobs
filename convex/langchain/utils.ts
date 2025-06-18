"use node";

import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { api, internal } from "../_generated/api";
import { ConvexCheckpointSaver } from "../checkpointer/checkpointer";
import { agentGraph } from "./agent";
import type { FunctionReturnType } from "convex/server";

export async function createHumanMessage(
  ctx: ActionCtx,
  text: string,
  documents?: Id<"documents">[],
): Promise<HumanMessage> {
  return new HumanMessage({
    content: [
      {
        type: "text",
        text,
      },
      ...(await Promise.all(
        documents?.map(async (documentId) => {
          let document = await ctx.runQuery(api.documents.queries.get, {
            documentId,
          });

          return {
            type: "file",
            file: {
              file_id: document._id,
            },
          };
        }) ?? [],
      )),
    ],
  });
}

export async function processStreamWithBatching(
  ctx: ActionCtx,
  stream: AsyncIterable<any>,
  streamId: Id<"streams">,
  abortController: AbortController,
): Promise<void> {
  const BUFFER_FLUSH_DELAY = 300; // ms
  const CANCELLATION_CHECK_DELAY = 1000; // ms - check for cancellation every 1s
  let lastFlush = Date.now();
  let lastCancellationCheck = Date.now();
  const buffer: string[] = [];
  let wasCancelled = false;
  let streamDoc: Doc<"streams"> | null = null;

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
          },
        );
        lastFlush = now;

        // Also check cancellation status from the returned streamDoc
        if (streamDoc?.status === "cancelled") {
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
        },
      );

      // Final check after flushing remaining buffer
      if (streamDoc?.status === "cancelled") {
        wasCancelled = true;
      }
    }

    // Only mark as done if not cancelled
    if (!wasCancelled) {
      await ctx.runMutation(internal.streams.mutations.update, {
        streamId,
        updates: { status: "done" },
      });
    }
  } catch (error) {
    console.error(error);

    // If we already know it was cancelled, don't override the status
    if (wasCancelled) {
      return;
    }

    // Check if the error was due to cancellation
    const errorStatus =
      streamDoc?.status ||
      (await ctx.runQuery(api.streams.queries.get, { streamId })).status;

    if (errorStatus === "cancelled") {
      return;
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      streamId,
      updates: { status: "error" },
    });
  }
}

async function createStreamConfig(
  ctx: ActionCtx,
  chatInput: FunctionReturnType<typeof internal.chatInputs.queries.getInternal>,
  signal?: AbortSignal,
) {
  const project = chatInput.projectId
    ? await ctx.runQuery(api.projects.queries.get, {
        projectId: chatInput.projectId,
      })
    : null;

  return {
    version: "v2" as const,
    configurable: {
      ctx,
      chatInput,
      thread_id: chatInput.chatId,
      customPrompt: project?.systemPrompt,
    },
    recursionLimit: 100,
    ...(signal && { signal }),
  };
}

export async function* filterStreamEvents(response: AsyncIterable<any>) {
  for await (const event of response) {
    if (
      ["on_chat_model_stream", "on_tool_start", "on_tool_end"].includes(
        event.event,
      )
    ) {
      const allowedNodes = ["baseAgent"];
      if (
        allowedNodes.some((node) =>
          event.metadata.checkpoint_ns.startsWith(node),
        )
      ) {
        yield event;
      }
    }
  }
}

export async function* streamHelper(
  ctx: ActionCtx,
  args: {
    chatInput: FunctionReturnType<typeof api.chatInputs.queries.get>;
    signal?: AbortSignal;
    includeHumanMessage?: boolean;
  },
) {
  const checkpointer = new ConvexCheckpointSaver(ctx);
  const streamConfig = await createStreamConfig(
    ctx,
    args.chatInput,
    args.signal,
  );

  let messages: BaseMessage[] = [];

  if (args.includeHumanMessage !== false) {
    const humanMessage = await createHumanMessage(
      ctx,
      args.chatInput.text!,
      args.chatInput.documents,
    );
    messages = [humanMessage];
  }

  const response = agentGraph
    .compile({ checkpointer })
    .streamEvents({ messages }, streamConfig);

  yield* filterStreamEvents(response);
}
