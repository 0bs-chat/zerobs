import React from "react";
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