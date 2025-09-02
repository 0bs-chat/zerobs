import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery, useConvex } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type {
  ToolChunkGroup,
  AIChunkGroup,
} from "../../../convex/langchain/state";
import {
  AIMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import {
  convertChunksToLangChainMessages,
  processStreamingChunks,
} from "../../../convex/chatMessages/helpers";
import { toast } from "sonner";

export type ChunkGroup = AIChunkGroup | ToolChunkGroup;
export async function* streamChunks(
  stream: Doc<"streams">,
  convex: ReturnType<typeof useConvex>,
): AsyncGenerator<ChunkGroup> {
  let lastChunkTime: number = 0;
  while (stream.status === "streaming") {
    console.log("lastChunkTime", lastChunkTime);
    const chunksResult = await convex.query(
      api.streams.queries.getChunks,
      {
        chatId: stream.chatId,
        lastChunkTime,
      },
    );
    if (!chunksResult?.chunks) break;
    for (const chunk of chunksResult?.chunks ?? []) {
      for (const chunkStr of chunk.chunks) {
        lastChunkTime = chunk._creationTime;
        yield JSON.parse(chunkStr) as ChunkGroup;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export function useStream(chatId: Id<"chats"> | "new") {
  const [chunks, setChunks] = useState<ChunkGroup[]>([]);
  const convex = useConvex();
  
  // Get stream info to check if we should start streaming
  const { data: stream } = useQuery({
    ...convexQuery(
      api.streams.queries.get,
      chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
    ),
  });

  useEffect(() => {
    if (!stream || chatId === "new") return;
    if (stream.status !== "streaming") {
      setChunks([]);
      return;
    }
    setChunks([]);
    
    const streamData = async () => {
      const collectedChunks: ChunkGroup[] = [];
      
      try {
        for await (const chunk of streamChunks(stream, convex)) {
          collectedChunks.push(chunk);
          setChunks([...collectedChunks.filter((c) => c.id !== chunk.id)]);
        }
      } catch (error) {
        toast.error("Stream error: " + error);
        console.error("Stream error: " + error);
      }
    };

    streamData();
  }, [stream, chatId, convex]);

  const groupedChunks = useMemo(() => processStreamingChunks(chunks), [chunks]);
  const langchainMessages = useMemo(() => convertChunksToLangChainMessages(groupedChunks), [groupedChunks]);
  const planningStepsMessage = useMemo(() => {
    if (!stream?.completedSteps || stream.completedSteps.length === 0)
      return null;

    return new AIMessage({
      content: "",
      additional_kwargs: {
        pastSteps: [
          [
            stream.completedSteps[0],
            mapChatMessagesToStoredMessages(langchainMessages),
          ],
          ...stream.completedSteps.slice(1).map((step: string) => [step, []]),
        ],
      },
    });
  }, [stream?.completedSteps, langchainMessages]);

  return {
    status: stream?.status,
    langchainMessages,
    planningStepsMessage,
  };
}
