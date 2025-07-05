import { useMemo, useEffect, useRef, useState } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
// Stream events are now pre-minified on the backend. We only receive AIChunkGroup
// and ToolChunkGroup objects, so we no longer depend on StreamEvent types.

// Define proper types based on LangChain StreamEvent structure
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
  // Get reactive data – Convex will push updates automatically
  const stream = useQuery(
    api.streams.queries.get,
    chatId !== "new" ? { chatId } : "skip",
  );

  const convex = useConvex();

  const [chunks, setChunks] = useState<(AIChunkGroup | ToolChunkGroup)[]>([]);
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
            const newEvents: (AIChunkGroup | ToolChunkGroup)[] = [];
            result.chunks.page.forEach((chunkDoc) => {
              chunkDoc.chunks.forEach((chunkStr) => {
                newEvents.push(JSON.parse(chunkStr) as AIChunkGroup | ToolChunkGroup);
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

      setChunks([]);
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

    const flushAI = () => {
      if (aiBuffer) {
        groups.push(aiBuffer);
        aiBuffer = null;
      }
    };

    for (const chunk of chunks) {
      if (chunk.type === "ai") {
        if (!aiBuffer) aiBuffer = { type: "ai", content: "" };
        aiBuffer.content += chunk.content;
        if (chunk.reasoning) {
          aiBuffer.reasoning = (aiBuffer.reasoning ?? "") + chunk.reasoning;
        }
      } else if (chunk.type === "tool") {
        // Flush any buffered AI content before handling tool chunk
        flushAI();

        let updated = false;
        if (chunk.isComplete) {
          // Try to find the most recent incomplete tool with the same name to update it
          for (let i = groups.length - 1; i >= 0; i--) {
            const g = groups[i];
            if (g.type === "tool" && g.toolName === chunk.toolName && !g.isComplete) {
              g.output = chunk.output;
              g.isComplete = true;
              updated = true;
              break;
            }
          }
        }

        // If no existing tool message was updated, push the current chunk as a new group
        if (!updated) {
          groups.push(chunk);
        }
      }
    }

    flushAI();
    return groups;
  }, [chunks]);

  // If completedSteps is not undefined, then planning/deepsearch mode is enabled
  return { chunkGroups, status: stream?.status, completedSteps: stream?.completedSteps };
}