import { useEffect, useMemo, useState, useRef } from "react";
import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { PaginationResult } from "convex/server";
import { useQuery } from "convex/react";

// Define proper types based on LangChain StreamEvent structure
interface AIChunkGroup {
  type: "ai";
  content: string;
  reasoning?: string;
}

interface ToolChunkGroup {
  type: "tool";
  toolName: string;
  input?: any;
  output?: any;
  isComplete: boolean;
}

export function useStream(chatId: Id<"chats">) {
  const lastTimeRef = useRef<number | undefined>(undefined);
  const [chunks, setChunks] = useState<StreamEvent[]>([]);

  const convex = new ConvexReactClient(
    import.meta.env.VITE_CONVEX_URL
  );
  
  // Get stream metadata reactively using Convex useQuery hook
  const stream = useQuery(
    api.streams.queries.get,
    chatId !== "new" ? { chatId } : "skip"
  );
  const streamState = useQuery(
    api.streams.queries.getState,
    chatId !== "new" ? { chatId } : "skip"
  );

  // Reset chunks when chatId changes
  useEffect(() => {
    lastTimeRef.current = undefined;
    setChunks([]);
  }, [chatId]);

  // polling for new chunks
  useEffect(() => {
    if (!stream) return;
    
    const streamId = stream._id;
    const streamStatus = stream.status;
    
    // Reset state when stream changes
    lastTimeRef.current = undefined;
    setChunks([]);

    async function pollChunks() {
      if (streamStatus !== "streaming") return;

      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        try {
          const result: {
            stream: Doc<"streams">;
            chunks: PaginationResult<Doc<"streamChunks">>;
          } = await convex.query(api.streams.queries.getChunks, {
            chatId: stream.chatId,
            lastChunkTime: lastTimeRef.current,
            paginationOpts: { numItems: 50, cursor },
          });

          if (result.chunks.page.length > 0) {
            // Parse the chunks from strings to StreamEvent objects
            const newEvents: StreamEvent[] = [];
            result.chunks.page.forEach((chunkDoc) => {
              chunkDoc.chunks.forEach((chunkStr) => {
                try {
                  const event = JSON.parse(chunkStr) as StreamEvent;
                  newEvents.push(event);
                } catch (error) {
                  console.error("Failed to parse chunk:", chunkStr, error);
                }
              });
            });

            setChunks((prev) => [...prev, ...newEvents]);
            lastTimeRef.current =
              result.chunks.page[result.chunks.page.length - 1]._creationTime;
          }

          hasMore = !result.chunks.isDone;
          cursor = result.chunks.continueCursor;
        } catch (error) {
          console.error("Error polling chunks:", error);
          break;
        }
      }
    }

    pollChunks();
  }, [convex, stream?._id, stream?.status]);

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
          // Handle chat model streaming events
          const content = chunk.data?.chunk?.content || "";
          const reasoningPart = chunk.data?.chunk?.additional_kwargs?.reasoning_content;
            
          if (!aiBuffer) aiBuffer = { type: "ai", content: "" };
          aiBuffer.content += content;
          if (reasoningPart) {
            aiBuffer.reasoning = (aiBuffer.reasoning ?? "") + reasoningPart;
          }
          break;
        }
        case "on_llm_stream": {
          // Handle LLM streaming events (for compatibility)
          const content = chunk.data?.chunk || "";
          if (!aiBuffer) aiBuffer = { type: "ai", content: "" };
          aiBuffer.content += content;
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
        // Handle other event types as needed
        default:
          // You can add more event types here as needed
          break;
      }
    }

    flushAI();
    return groups;
  }, [chunks]);

  return { chunkGroups, status: stream?.status, streamState };
}