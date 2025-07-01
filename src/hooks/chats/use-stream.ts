import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMemo, useEffect } from "react";
import { currentCursorAtom, processedChunksAtom } from "@/store/chatStore";
import { useAtom } from "jotai";

export interface AIChunkGroup {
  type: "ai";
  content: string;
  reasoning?: string;
}

export interface ToolChunkGroup {
  type: "tool";
  toolName: string;
  input?: unknown;
  output?: unknown;
  isComplete: boolean;
}

const flushAI = (
  groups: (AIChunkGroup | ToolChunkGroup)[],
  aiBuffer: AIChunkGroup | null
): AIChunkGroup | null => {
  if (aiBuffer) {
    groups.push(aiBuffer);
    return null;
  }
  return aiBuffer;
};

export function useStream(chatId: Id<"chats">) {
  const [cursor, setCursor] = useAtom(currentCursorAtom);
  const [processedChunks, setProcessedChunks] = useAtom(processedChunksAtom);

  const streamData = useQuery(api.streams.queries.getChunks, {
    chatId,
    paginationOpts: { numItems: 10, cursor },
  });

  const steps = useQuery(api.streams.queries.getState, { chatId });
  const messages = useQuery(api.chatMessages.queries.get, {
    chatId,
    getCurrentThread: true,
  });

  if (!streamData) throw new Error("Stream data not found");

  const parsedChunks = useMemo(
    () =>
      streamData.chunks.page.flatMap((chunkDoc) =>
        chunkDoc.chunks.map((chunkString) => JSON.parse(chunkString))
      ),
    [streamData.chunks.page]
  );

  // accumulate processed chunks on the load and not
  useEffect(() => {
    if (parsedChunks.length > 0) {
      setProcessedChunks((prev) => [...(prev ?? []), ...parsedChunks]);
    }
  }, [parsedChunks]);

  const loadMore = () => {
    if (streamData?.chunks.continueCursor) {
      setCursor(streamData.chunks.continueCursor);
    }
  };

  const chunkGroups = useMemo(() => {
    const groups: (AIChunkGroup | ToolChunkGroup)[] = [];
    let aiBuffer: AIChunkGroup | null = null;

    if (!processedChunks)
      throw new Error(`Processed chunks: ${JSON.stringify(processedChunks)}`);

    for (const chunk of processedChunks) {
      switch (chunk.type) {
        case "ai": {
          const { content = "", reasoning = "" } = chunk;
          if (!aiBuffer) aiBuffer = { type: "ai", content: "" };
          aiBuffer.content += content;
          if (reasoning) aiBuffer.reasoning = reasoning;
          break;
        }
        case "tool": {
          aiBuffer = flushAI(groups, aiBuffer);
          const tool: ToolChunkGroup = {
            type: "tool",
            toolName: chunk.toolName || "Tool",
            input: chunk.input,
            isComplete: chunk.isComplete,
          };
          groups.push(tool);
          break;
        }
      }
    }

    aiBuffer = flushAI(groups, aiBuffer);
    return groups;
  }, [processedChunks]);

  return {
    chunkGroups,
    loadMore,
    hasMore: streamData.chunks.continueCursor !== null,
    streamStatus: streamData.chunks.continueCursor ? "loading" : "complete",
    steps,
    messages,
  };
}
