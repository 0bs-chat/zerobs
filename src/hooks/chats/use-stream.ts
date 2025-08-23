import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useConvex } from "@convex-dev/react-query";
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
  const {
    data: stream,
    isError: isStreamError,
    error: streamError,
  } = useQuery({
    ...convexQuery(
      api.streams.queries.get,
      chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip"
    ),
  });

  const [groupedChunks, setGroupedChunks] = useState<ChunkGroup[]>([]);
  const [lastSeenTime, setLastSeenTime] = useState<number | undefined>(
    undefined
  );

  const convex = useConvex();

  // Reset state when chat or stream changes
  useEffect(() => {
    setLastSeenTime(undefined);
    setGroupedChunks([]);
  }, [chatId, stream?._id]);

  // Poll for new chunks every 300ms when streaming
  useEffect(() => {
    if (!stream || stream.status !== "streaming") return;
    let isMounted = true;
    let polling = false;
    const interval = setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const result = await convex.query(api.streams.queries.getChunks, {
          chatId: stream.chatId,
          lastChunkTime: lastSeenTime,
          paginationOpts: { numItems: 200, cursor: null },
        });
        if (!isMounted || !result?.chunks?.page?.length) return;
        // Only process chunks newer than lastSeenTime
        const newEvents: ChunkGroup[] = result.chunks.page
          .filter(
            (chunkDoc: any) =>
              lastSeenTime === undefined ||
              chunkDoc._creationTime > lastSeenTime
          )
          .flatMap((chunkDoc: any) =>
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
                lastGroup = chunk;
                newGroups.push(chunk);
              }
            }
            return newGroups;
          });
          const latestChunkTime =
            result.chunks.page[result.chunks.page.length - 1]._creationTime;
          setLastSeenTime(latestChunkTime);
        }
      } finally {
        polling = false;
      }
    }, 300);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stream?.status, stream?.chatId, lastSeenTime]);

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
    isError: isStreamError,
    error: streamError,
  };
}
