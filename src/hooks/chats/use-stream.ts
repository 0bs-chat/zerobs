import { useEffect, useState, useMemo } from "react";
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
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
  processStreamingChunks,
  convertChunksToLangChainMessages,
} from "../../../convex/chatMessages/helpers";

export type ChunkGroup = AIChunkGroup | ToolChunkGroup;
export async function* streamChunks(
  stream: Doc<"streams">,
  queryClient: QueryClient,
): AsyncGenerator<ChunkGroup> {
  let lastChunkTime: number = 0;
  while (stream.status === "streaming") {
    console.log("lastChunkTime", lastChunkTime);
    const chunksResult = await queryClient.fetchQuery({
      ...convexQuery(
        api.streams.queries.getChunks,
        {
          chatId: stream.chatId,
          lastChunkTime,
        },
      ),
    });
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
  const queryClient = useQueryClient();
  
  // Get stream info to check if we should start streaming
  const { data: stream } = useQuery({
    ...convexQuery(
      api.streams.queries.get,
      chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
    ),
  });

  useEffect(() => {
    if (!stream || chatId === "new") return;
    if (stream.status === "done") {
      return;
    }
    setChunks([]);
    
    const streamData = async () => {
      const collectedChunks: ChunkGroup[] = [];
      
      try {
        for await (const chunk of streamChunks(stream, queryClient)) {
          collectedChunks.push(chunk);
          setChunks([...collectedChunks]);
        }
      } catch (error) {
        console.error("Stream error:", error);
      }
    };

    streamData();
  }, [stream, chatId, queryClient]);

  const groupedChunks = processStreamingChunks(chunks);
  const langchainMessages = convertChunksToLangChainMessages(groupedChunks);

  // Generate planning steps message
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
