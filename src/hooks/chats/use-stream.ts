import { useEffect, useState, useMemo } from "react";
import { useQuery } from "convex/react";
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
  const stream = useQuery(
    api.streams.queries.get,
    chatId !== "new" ? { chatId } : "skip"
  );

  const [groupedChunks, setGroupedChunks] = useState<ChunkGroup[]>([]);
  const [lastSeenTime, setLastSeenTime] = useState<number | undefined>(
    undefined
  );

  // Reset state when chat or stream changes
  useEffect(() => {
    setLastSeenTime(undefined);
    setGroupedChunks([]);
  }, [chatId, stream?._id]);

  // Reactive query for chunks - uses stream._creationTime as dependency for reactivity
  // but still filters by lastSeenTime for bandwidth optimization
  const chunksResult = useQuery(
    api.streams.queries.getChunks,
    stream && stream.status === "streaming"
      ? {
          chatId: stream.chatId,
          lastChunkTime: lastSeenTime,
          paginationOpts: { numItems: 200, cursor: null },
        }
      : "skip"
  );

  // Process new chunks when they arrive
  useEffect(() => {
    if (!chunksResult?.chunks.page.length) return;

    const newEvents: ChunkGroup[] = chunksResult.chunks.page.flatMap(
      (chunkDoc: any) =>
        chunkDoc.chunks.map(
          (chunkStr: string) => JSON.parse(chunkStr) as ChunkGroup
        )
    );

    if (newEvents.length > 0) {
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
            // Handle tool chunks (start, stream, end)
            if (
              lastGroup?.type === "tool" &&
              lastGroup.toolCallId === (chunk as ToolChunkGroup).toolCallId &&
              !lastGroup.isComplete &&
              !chunk.isComplete
            ) {
              // Same ongoing tool call → append partial output if present
              if (chunk.output !== undefined) {
                if (
                  typeof lastGroup.output === "string" &&
                  typeof chunk.output === "string"
                ) {
                  lastGroup.output = (lastGroup.output ?? "") + chunk.output;
                } else if (
                  Array.isArray(lastGroup.output) &&
                  Array.isArray(chunk.output)
                ) {
                  lastGroup.output.push(...chunk.output);
                } else {
                  // Fallback: replace
                  lastGroup.output = chunk.output;
                }
              }
            } else {
              lastGroup = chunk;
              newGroups.push(chunk);
            }
          }
        }
        return newGroups;
      });

      // Update lastSeenTime to the latest chunk time for next query
      const latestChunkTime =
        chunksResult.chunks.page[chunksResult.chunks.page.length - 1]
          ._creationTime;
      setLastSeenTime(latestChunkTime);
    }
  }, [chunksResult]);

  // Clear chunks when stream is not active
  useEffect(() => {
    if (!stream || stream.status !== "streaming") {
      setGroupedChunks([]);
    }
  }, [stream?.status]);

  // Convert chunk groups to LangChain messages
  const langchainMessages = useMemo(() => {
    if (!groupedChunks || groupedChunks.length === 0) return [];
    const completedIds = new Set(
      groupedChunks
        .filter((c) => c.type === "tool" && c.isComplete)
        .map((c) => (c as ToolChunkGroup).toolCallId)
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
              content:
                typeof chunk.output === "string"
                  ? chunk.output
                  : JSON.stringify(chunk.output ?? ""),
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
          ...stream.completedSteps.slice(1).map((step) => [step, []]),
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
