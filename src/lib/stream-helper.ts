// hooks/useStream.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
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
        const newDocs = await convex.query(
          api.streams.queries.getChunks,
          {
            streamId: chatInput?.streamId!,
            lastChunkTime: lastTimeRef.current,
          }
        );
        if (cancelled) return;

        if (newDocs.length > 0) {
          const events = newDocs.map((d: Doc<"streamChunks">) =>
            JSON.parse(d.chunk) as StreamEvent
          );
          setChunks((prev) => [...prev, ...events]);
          lastTimeRef.current =
            newDocs[newDocs.length - 1]._creationTime;
        }

        if (stream?.status === "streaming") {
          await new Promise((r) => setTimeout(r, 100));
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