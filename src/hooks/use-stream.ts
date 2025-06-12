// hooks/useStream.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import type { PaginationResult } from "convex/server";

export function useStream(chatId: Id<"chats"> | "new") {
  const convex = useConvex();
  const lastTimeRef = useRef<number | undefined>(undefined);
  const [chunks, setChunks] = useState<StreamEvent[]>([]);
  const chatInput = useQuery(api.chatInputs.queries.get, { chatId: chatId });
  const stream = useQuery(api.streams.queries.get, chatInput?.streamId ? { streamId: chatInput.streamId! } : "skip");

  useEffect(() => {
    if (!chatInput?.streamId) return;
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
              streamId: chatInput?.streamId!,
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
  }, [convex, chatInput?.streamId, stream]);

  return { chunks, status: stream?.status };
}