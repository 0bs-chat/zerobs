// hooks/useStream.ts
"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";

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
  // Get stream metadata reactively
  const stream = useQuery(api.streams.queries.getFromChatId, {
    chatId,
  });

  // Get all chunks reactively - no polling needed!
  const rawChunkStrings = useQuery(
    api.streams.queries.getAllChunks,
    stream?._id ? { streamId: stream._id } : "skip"
  );

  // Parse raw chunk strings into events
  const chunks = useMemo(() => {
    if (!rawChunkStrings) return [];
    return rawChunkStrings.map(
      (chunkStr) => JSON.parse(chunkStr) as StreamEvent
    );
  }, [rawChunkStrings]);

  // Process chunks into grouped AI/tool events
  const chunkGroups = useMemo(() => {
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
    return groups;
  }, [chunks]);

  return { chunkGroups, status: stream?.status };
}
