import { useEffect, useRef, useState } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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

export function useStream(chatId: Id<"chats">) {
  // not checking for
  const stream = useQuery(api.streams.queries.get, { chatId });
  const convex = useConvex();

  const [groupedChunks, setGroupedChunks] = useState<ChunkGroup[]>([]);
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    lastTimeRef.current = undefined;
    setGroupedChunks([]);
  }, [chatId, stream?._id]);

  useEffect(() => {
    if (!stream || stream.status !== "streaming") {
      // Clear chunks when stream is not active or has completed
      setGroupedChunks([]);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      while (!cancelled && stream.status === "streaming") {
        try {
          const result = await convex.query(api.streams.queries.getChunks, {
            chatId: stream.chatId,
            lastChunkTime: lastTimeRef.current,
            paginationOpts: { numItems: 50, cursor: null },
          });

          if (cancelled) return;

          if (result.chunks.page.length > 0) {
            const newEvents: ChunkGroup[] = result.chunks.page.flatMap(
              (chunkDoc) =>
                chunkDoc.chunks.map(
                  (chunkStr) => JSON.parse(chunkStr) as ChunkGroup
                )
            );

            setGroupedChunks((prev) => {
              const newGroups = [...prev];
              let lastGroup =
                newGroups.length > 0 ? newGroups[newGroups.length - 1] : null;

              for (const chunk of newEvents) {
                if (chunk.type === "ai") {
                  if (lastGroup?.type === "ai") {
                    lastGroup.content += chunk.content;
                    if (chunk.reasoning) {
                      lastGroup.reasoning =
                        (lastGroup.reasoning ?? "") + chunk.reasoning;
                    }
                  } else {
                    lastGroup = { ...chunk };
                    newGroups.push(lastGroup);
                  }
                } else {
                  lastGroup = chunk;
                  newGroups.push(chunk);
                }
              }
              return newGroups;
            });
            lastTimeRef.current =
              result.chunks.page[result.chunks.page.length - 1]._creationTime;
          }
        } catch (err) {
          console.error("Polling error", err);
          break;
        }
        await new Promise((res) => setTimeout(res, 300));
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [convex, stream]);

  return {
    chunkGroups: groupedChunks,
    status: stream?.status,
    completedSteps: stream?.completedSteps,
  };
}
