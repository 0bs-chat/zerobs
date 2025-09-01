import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  ToolChunkGroup,
  AIChunkGroup,
} from "../../../convex/langchain/state";
import {
  AIMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import { 
  groupStreamChunks, 
  convertChunksToLangChainMessages 
} from "../../../convex/chatMessages/helpers";

export type ChunkGroup = AIChunkGroup | ToolChunkGroup;

export function useStream(chatId: Id<"chats"> | "new") {
  // Get stream info
  const { data: stream } = useQuery({
    ...convexQuery(
      api.streams.queries.get,
      chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
    ),
  });

  // Get all chunks for the stream reactively
  const { data: chunksResult } = useQuery({
    ...convexQuery(
      api.streams.queries.getChunks,
      stream
        ? {
            chatId: stream.chatId,
            lastChunkTime: undefined, // Get all chunks
            paginationOpts: { numItems: 1000, cursor: null },
          }
        : "skip",
    ),
  });

  // Process and group chunks into messages
  const groupedChunks = useMemo(() => {
    if (!chunksResult?.chunks?.page?.length) return [];

    // Flatten all chunks from all documents and sort by creation time
    const allChunks = chunksResult.chunks.page
      .sort((a, b) => a._creationTime - b._creationTime)
      .flatMap((chunkDoc) =>
        chunkDoc.chunks.map((chunkStr: string) => 
          JSON.parse(chunkStr) as ChunkGroup
        )
      );

    // Use helper function to group chunks intelligently
    return groupStreamChunks(allChunks);
  }, [chunksResult]);

  // Convert chunk groups to LangChain messages
  const langchainMessages = useMemo(() => {
    if (!groupedChunks.length) return [];
    
    // Use helper function to convert chunks to LangChain messages
    return convertChunksToLangChainMessages(groupedChunks);
  }, [groupedChunks]);

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
