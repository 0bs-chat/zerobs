// hooks/useStream.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { PaginationResult } from "convex/server";
import React from "react";

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

export type ChunkGroup = AIChunkGroup | ToolChunkGroup;

interface UseStreamProcessorProps {
  streamChunks?: StreamEvent[];
}

export const useStreamProcessor = ({ streamChunks }: UseStreamProcessorProps) => {
  return React.useMemo(() => {
    if (!streamChunks) {
      return { chunkGroups: [] };
    }

    const chunkGroups: ChunkGroup[] = [];
    let aiBuffer: AIChunkGroup | null = null;
    const toolMap = new Map<string, ToolChunkGroup>();

    const flushAI = () => {
      if (aiBuffer) {
        chunkGroups.push(aiBuffer);
        aiBuffer = null;
      }
    };

    for (const chunk of streamChunks) {
      const id = chunk.run_id ?? String(chunk.name);

      switch (chunk.event) {
        case "on_chat_model_stream": {
          const { content = "", additional_kwargs = {} } = chunk.data.chunk.kwargs;
          const reasoningPart: string | undefined = additional_kwargs.reasoning_content;

          aiBuffer ??= { type: "ai", content: "" };
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
          chunkGroups.push(tool); // optimistic push; we'll update later when complete
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
            // orphaned end; treat as complete tool without start data
            chunkGroups.push({
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

    return { chunkGroups };
  }, [streamChunks]);
};

export function useStream(chatId: Id<"chats"> | "new") {
  const convex = useConvex();
  const lastTimeRef = useRef<number | undefined>(undefined);
  const [chunks, setChunks] = useState<StreamEvent[]>([]);
  const stream = useQuery(api.streams.queries.getFromChatId, { chatId: chatId });

  useEffect(() => {
    if (!stream) return;
    let cancelled = false;

    // reset whenever streamId changes
    lastTimeRef.current = undefined;
    setChunks([]);

    async function pollChunks() {
      if (stream?.status === "streaming") {
        // Collect all new chunk pages until there are none left.
        let cursor: string | null = null;
        let hasMore = true;

        while (hasMore && !cancelled) {
          const result: PaginationResult<Doc<"streamChunks">> = await convex.query(
            api.streams.queries.getChunks,
            {
              streamId: stream._id,
              lastChunkTime: lastTimeRef.current,
              paginationOpts: {
                numItems: 50,
                cursor,
              },
            },
          );
          
          if (cancelled) return;

          if (result.page.length > 0) {
            const events: StreamEvent[] = [];
            result.page.forEach((d) => {
              d.chunks.forEach((chunkStr: string) => {
                const event = JSON.parse(chunkStr) as StreamEvent;
                events.push(event);
              });
            });
            setChunks((prev) => [...prev, ...events]);
            lastTimeRef.current = result.page[result.page.length - 1]._creationTime;
          }

          // Determine if we should continue fetching.
          hasMore = !result.isDone;
          cursor = result.continueCursor;
        }

        if (stream?.status === "streaming") {
          await new Promise((r) => setTimeout(r, 300));
          if (!cancelled) await pollChunks();
        }
      }
    }

    pollChunks();
    return () => {
      cancelled = true;
    };
  }, [convex, stream]);

  return { chunks, status: stream?.status };
}