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
  ToolMessage as LangChainToolMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";

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
        chunkDoc.chunks.map((chunkStr: string) => ({
          chunk: JSON.parse(chunkStr) as ChunkGroup,
          timestamp: chunkDoc._creationTime,
        }))
      );

    // Group chunks intelligently
    const groups: ChunkGroup[] = [];
    let currentGroup: ChunkGroup | null = null;

    for (const { chunk } of allChunks) {
      if (chunk.type === "ai") {
        // Merge consecutive AI chunks
        if (currentGroup?.type === "ai") {
          currentGroup.content += chunk.content;
          if (chunk.reasoning) {
            currentGroup.reasoning = (currentGroup.reasoning ?? "") + chunk.reasoning;
          }
        } else {
          currentGroup = { ...chunk };
          groups.push(currentGroup);
        }
      } else if (chunk.type === "tool") {
        // Tools are always separate groups
        currentGroup = chunk;
        groups.push(currentGroup);
      }
    }

    return groups;
  }, [chunksResult]);

  // Convert chunk groups to LangChain messages
  const langchainMessages = useMemo(() => {
    if (!groupedChunks.length) return [];
    
    const completedIds = new Set(
      groupedChunks
        .filter((c) => c.type === "tool" && c.isComplete)
        .map((c) => (c as ToolChunkGroup).toolCallId),
    );

    return groupedChunks
      .map((chunk) => {
        if (chunk.type === "ai") {
          return new AIMessage({
            content: chunk.content,
            additional_kwargs: chunk.reasoning
              ? { reasoning_content: chunk.reasoning }
              : {},
          });
        }
        
        if (chunk.type === "tool") {
          if (chunk.isComplete) {
            return new LangChainToolMessage({
              content: chunk.output as string,
              name: chunk.toolName,
              tool_call_id: chunk.toolCallId,
              additional_kwargs: {
                input: JSON.parse(JSON.stringify(chunk.input)),
                is_complete: true,
              },
            });
          }
          
          if (!completedIds.has(chunk.toolCallId)) {
            return new LangChainToolMessage({
              name: chunk.toolName,
              tool_call_id: chunk.toolCallId,
              content: "",
              additional_kwargs: {
                input: JSON.parse(JSON.stringify(chunk.input)),
                is_complete: false,
              },
            });
          }
        }
        
        return undefined;
      })
      .filter(Boolean) as (AIMessage | LangChainToolMessage)[];
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
