// hooks/useStream.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";

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
          const result: any = await convex.query(
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

          const { page, isDone, continueCursor } = result as any;

          if (page.length > 0) {
            const events = page.map((d: any) =>
              JSON.parse(d.chunk) as StreamEvent,
            );
            setChunks((prev) => [...prev, ...events]);
            lastTimeRef.current = page[page.length - 1]._creationTime;
          }

          // Determine if we should continue fetching.
          hasMore = !isDone;
          cursor = (continueCursor as string | null | undefined) ?? null;
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