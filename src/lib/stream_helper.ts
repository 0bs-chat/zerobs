"use client";

/// React helpers for persistent text streaming.
import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import { api } from "../../convex/_generated/api";

if (typeof window === "undefined") {
  throw new Error("this is frontend code, but it's running somewhere else!");
}

type StreamBody = {
  chunks: StreamEvent[];
  status: Doc<"streams">["status"];
}

export function useStream(
  streamId?: Id<"streams">,
) {
  const [streamEnded, setStreamEnded] = useState(null as boolean | null);

  const streamStarted = useRef(false);

  const persistentData = useQuery(
    api.streams.queries.getChunks,
    streamId ? { streamId: streamId! } : "skip"
  );
  const [streamChunks, setStreamChunks] = useState<StreamEvent[]>([]);
  let lastChunkTime = persistentData?.chunks && persistentData.chunks.length > 0
    ? persistentData?.chunks[persistentData.chunks.length - 1]._creationTime : Date.now();
  console.log(JSON.stringify({
    lastChunkTime,
    streamId: streamId || "skip",
    streamStarted: streamStarted.current,
    streamEnded,
    persistentData: persistentData?.chunks.length,
    streamChunks,
  }, null, 2));

  useEffect(() => {
    if (streamId && !streamStarted.current) {
      void (async () => {
        const success = await startStreaming(streamId, lastChunkTime, (text) => {
          setStreamChunks((prev) => [...prev, JSON.parse(text) as StreamEvent]);
        });
        setStreamEnded(success);
      })();
      // If we get remounted, we don't want to start a new stream.
      return () => {
        streamStarted.current = true;
      };
    }
  }, [streamId, setStreamEnded, streamStarted]);

  const body = useMemo<StreamBody>(() => {
    if (persistentData) {
      // Parse the string chunks into StreamEvent objects
      const parsedChunks = persistentData.chunks
        .map(chunk => {
          try {
            return JSON.parse(chunk.chunk) as StreamEvent;
          } catch (e) {
            console.error("Error parsing chunk", e, chunk.chunk);
            return null;
          }
        })
        .filter((chunk): chunk is StreamEvent => chunk !== null);

      return {
        chunks: parsedChunks,
        status: persistentData.stream.status,
      };
    }
    
    let status: Doc<"streams">["status"];
    if (streamEnded === null) {
      status = streamChunks.length > 0 ? "streaming" : "pending";
    } else {
      status = streamEnded ? "done" : "error";
    }
    
    return {
      chunks: streamChunks,
      status,
    };
  }, [persistentData, streamChunks, streamEnded]);

  return body;
}

async function startStreaming(
  streamId: Id<"streams">,
  lastChunkTime: number,
  onUpdate: (text: string) => void
) {
  const response = await fetch(`${import.meta.env.VITE_CONVEX_URL}/stream`, {
    method: "POST",
    body: JSON.stringify({
      streamId: streamId,
      lastChunkTime: lastChunkTime,
    }),
    headers: { "Content-Type": "application/json" },
  });
  // Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams
  if (response.status === 205) {
    console.error("Stream already finished", response);
    return false;
  }
  if (!response.ok) {
    console.error("Failed to reach streaming endpoint", response);
    return false;
  }
  if (!response.body) {
    console.error("No body in response", response);
    return false;
  }
  const reader = response.body.getReader();
  while (true) {
    try {
      const { done, value } = await reader.read();
      if (done) {
        onUpdate(new TextDecoder().decode(value));
        return true;
      }
      onUpdate(new TextDecoder().decode(value));
    } catch (e) {
      console.error("Error reading stream", e);
      return false;
    }
  }
}
