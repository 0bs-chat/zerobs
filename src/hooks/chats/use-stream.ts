import { useMemo, useEffect, useRef, useState } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";

// Define proper types based on LangChain StreamEvent structure
interface AIChunkGroup {
  type: "ai";
  content: string;
  reasoning?: string;
}

interface ToolChunkGroup {
  type: "tool";
  toolName: string;
  input?: unknown;
  output?: unknown;
  isComplete: boolean;
}

export function useStream(chatId: Id<"chats"> | "new") {
  // Get reactive data – Convex will push updates automatically
  const stream = useQuery(
    api.streams.queries.get,
    chatId !== "new" ? { chatId } : "skip",
  );

  const streamState = useQuery(
    api.streams.queries.getState,
    chatId !== "new" ? { chatId } : "skip",
  );

  const convex = useConvex();

  const [chunks, setChunks] = useState<StreamEvent[]>([]);
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    lastTimeRef.current = undefined;
    setChunks([]);
  }, [chatId, stream?._id]);

  useEffect(() => {
    if (!stream || stream.status !== "streaming") return;

    let cancelled = false;

    async function poll() {
      while (!cancelled && stream?.status === "streaming") {
        try {
          const result = await convex.query(api.streams.queries.getChunks, {
            chatId: stream.chatId,
            lastChunkTime: lastTimeRef.current,
            paginationOpts: { numItems: 50, cursor: null },
          });

          if (result.chunks.page.length > 0) {
            const newEvents: StreamEvent[] = [];
            result.chunks.page.forEach((chunkDoc) => {
              chunkDoc.chunks.forEach((chunkStr) => {
                newEvents.push(JSON.parse(chunkStr) as StreamEvent);
              });
            });

            setChunks((prev) => [...prev, ...newEvents]);
            lastTimeRef.current =
              result.chunks.page[result.chunks.page.length - 1]._creationTime;
          }
        } catch (err) {
          console.error("Polling error", err);
          break;
        }

        // Wait 300ms before next poll
        await new Promise((res) => setTimeout(res, 300));
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [convex, stream?.status, stream?._id]);

  // Group consecutive chunks into AI / Tool blocks
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
      const id = chunk.run_id;
      switch (chunk.event) {
        case "on_chat_model_stream": {
          const content = chunk.data?.chunk?.content ?? "";
          const reasoning =
            chunk.data?.chunk?.additional_kwargs?.reasoning_content ?? "";
          if (!aiBuffer) aiBuffer = { type: "ai", content: "" };
          aiBuffer.content += content;
          if (reasoning) {
            aiBuffer.reasoning = (aiBuffer.reasoning ?? "") + reasoning;
          }
          break;
        }
        case "on_llm_stream": {
          const content = chunk.data?.chunk ?? "";
          if (!aiBuffer) aiBuffer = { type: "ai", content: "" };
          aiBuffer.content += content;
          break;
        }
        case "on_tool_start": {
          flushAI();
          const tool: ToolChunkGroup = {
            type: "tool",
            toolName: chunk.name ?? "Tool",
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
              toolName: chunk.name ?? "Tool",
              output: chunk.data?.output,
              isComplete: true,
            });
          }
          break;
        }
        default:
          break;
      }
    }

    flushAI();
    return groups;
  }, [chunks]);

  return { chunkGroups, status: stream?.status, streamState };
}