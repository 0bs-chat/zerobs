import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useConvex } from "convex/react";
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
    chatId !== "new" ? { chatId } : "skip",
  );
  const convex = useConvex();

  const [groupedChunks, setGroupedChunks] = useState<ChunkGroup[]>([]);
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    lastTimeRef.current = undefined;
    setGroupedChunks([]);
  }, [chatId, stream?._id]);

  useEffect(() => {
    if (!stream || stream.status !== "streaming") {
      // Clear chunks when stream is not active or has completed
      setGroupedChunks([]);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      while (!cancelled && stream.status === "streaming") {
        try {
          const result = await convex.query(api.streams.queries.getChunks, {
            chatId: stream.chatId,
            lastChunkTime: lastTimeRef.current,
            paginationOpts: { numItems: 200, cursor: null },
          });

          if (cancelled) return;

          if (result.chunks.page.length > 0) {
            const newEvents: ChunkGroup[] = result.chunks.page.flatMap(
              (chunkDoc) =>
                chunkDoc.chunks.map(
                  (chunkStr) => JSON.parse(chunkStr) as ChunkGroup,
                ),
            );

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
            lastTimeRef.current =
              result.chunks.page[result.chunks.page.length - 1]._creationTime;
          }
        } catch (err) {
          console.error("Polling error", err);
          break;
        }
        await new Promise((res) => setTimeout(res, 300));
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [convex, stream]);

  // Convert chunk groups to LangChain messages
  const langchainMessages = useMemo(() => {
    if (!groupedChunks || groupedChunks.length === 0) return [];
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
              tool_call_id: `streaming-tool-${chunk.toolName}`,
              additional_kwargs: {
                input: JSON.parse(JSON.stringify(chunk.input)),
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
    chunkGroups: groupedChunks,
    status: stream?.status,
    completedSteps: stream?.completedSteps,
    langchainMessages,
    planningStepsMessage,
    isStreaming: stream?.status === "streaming",
  };
}
