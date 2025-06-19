// hooks/useStream.ts
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { PaginationResult } from "convex/server";

export interface AIChunkGroup {
  type: "ai";
  content: string;
  reasoning?: string;
}

export interface ToolChunkGroup {
  type: "tool";
  toolName: string;
  input?: unknown;
  output?: unknown;
  isComplete: boolean;
}

export function useStream(chatId: Id<"chats"> | "new") {
  const convex = useConvex();
  const lastTimeRef = useRef<number | undefined>(undefined);
  const [chunks, setChunks] = useState<StreamEvent[]>([]);
  const stream = useQuery(api.streams.queries.getFromChatId, {
    chatId,
  });

  // Reset chunks when chatId changes
  useEffect(() => {
    lastTimeRef.current = undefined;
    setChunks([]);
  }, [chatId]);

  // polling for new chunks
  useEffect(() => {
    if (!stream) return;
    let cancelled = false;
    lastTimeRef.current = undefined;
    setChunks([]);

    async function pollChunks() {
      if (stream?.status !== "streaming" || cancelled) return;

      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore && !cancelled) {
        const result: PaginationResult<Doc<"streamChunks">> =
          await convex.query(api.streams.queries.getChunks, {
            streamId: stream._id,
            lastChunkTime: lastTimeRef.current,
            paginationOpts: { numItems: 50, cursor },
          });

        if (cancelled) return;

        if (result.page.length > 0) {
          const events: StreamEvent[] = [];
          result.page.forEach((d) =>
            d.chunks.forEach((chunkStr) =>
              events.push(JSON.parse(chunkStr) as StreamEvent),
            ),
          );
          setChunks((prev) => [...prev, ...events]);
          lastTimeRef.current =
            result.page[result.page.length - 1]._creationTime;
        }

        hasMore = !result.isDone;
        cursor = result.continueCursor;
      }

      if (!cancelled) {
        // throttle before next poll
        await new Promise((r) => setTimeout(r, 300));
        pollChunks();
      }
    }

    pollChunks();
    return () => {
      cancelled = true;
    };
  }, [convex, stream]);

  // process raw chunks into grouped AI/tool events
  const { chunkGroups } = useMemo(() => {
    const groups: (AIChunkGroup | ToolChunkGroup)[] = [];
    let aiBuffer: AIChunkGroup | null = null;
    const toolMap = new Map<string, ToolChunkGroup>();

    const flushAI = () => {
      if (aiBuffer) {
        groups.push(aiBuffer);
        aiBuffer = null;
      }
    };

    for (const chunk of chunks) {
      const id = chunk.run_id ?? String(chunk.name);
      switch (chunk.event) {
        case "on_chat_model_stream": {
          const { content = "", additional_kwargs = {} } =
            chunk.data.chunk.kwargs;
          const reasoningPart = additional_kwargs.reasoning_content as
            | string
            | undefined;
          if (!aiBuffer) aiBuffer = { type: "ai", content: "" };
          aiBuffer.content += content;
          if (reasoningPart) {
            aiBuffer.reasoning = (aiBuffer.reasoning ?? "") + reasoningPart;
          }
          break;
        }
        case "on_tool_start": {
          flushAI();
          const tool: ToolChunkGroup = {
            type: "tool",
            toolName: chunk.name || "Tool",
            input: chunk.data?.input,
            isComplete: false,
          };
          groups.push(tool);
          toolMap.set(id, tool);
          break;
        }
        case "on_tool_end": {
          flushAI();
          const tool = toolMap.get(id);
          if (tool) {
            tool.output = chunk.data?.output;
            tool.isComplete = true;
            toolMap.delete(id);
          } else {
            groups.push({
              type: "tool",
              toolName: chunk.name || "Tool",
              output: chunk.data?.output,
              isComplete: true,
            });
          }
          break;
        }
      }
    }

    flushAI();
    return { chunkGroups: groups };
  }, [chunks]);

  return { chunkGroups, status: stream?.status };
}
