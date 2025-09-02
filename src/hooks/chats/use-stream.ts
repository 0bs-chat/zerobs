import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  groupStreamChunks,
  convertChunksToLangChainMessages,
} from "../../../convex/chatMessages/helpers";
import { ConvexReactClient } from "convex/react";

export type ChunkGroup = AIChunkGroup | ToolChunkGroup;

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export async function* streamChunks(chatId: Id<"chats"> | "new"): AsyncGenerator<ChunkGroup> {
  const { data: stream } = useQuery({
    ...convexQuery(
      api.streams.queries.get,
      chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
    ),
  });
  if (!stream) return;
  let lastChunkTime: number = 0;
  while (stream.status === "streaming") {
    const chunksResult = await convex.query(
      api.streams.queries.getChunks,
      {
        chatId: stream.chatId,
        lastChunkTime,
      }
    );
    if (!chunksResult) break;
    for (const chunk of chunksResult.chunks) {
      for (const chunkStr of chunk.chunks) {
        lastChunkTime = chunk._creationTime;
        yield JSON.parse(chunkStr) as ChunkGroup;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export async function useStream(chatId: Id<"chats"> | "new") {
  const stream = await streamChunks(chatId);
  const groups: ChunkGroup[] = [];
  for await (const chunk of stream) {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.type === chunk.type) {
      if (chunk.type === "ai" && currentGroup.type === "ai") {
        currentGroup.content += chunk.content;
        if (chunk.reasoning) {
          currentGroup.reasoning = (currentGroup.reasoning ?? "") + chunk.reasoning;
        }
      } else if (chunk.type === "tool" && currentGroup.type === "tool") {
        if (chunk.isComplete) {
          currentGroup.input = chunk.input as string;
          currentGroup.output = chunk.output;
          currentGroup.isComplete = true;
        } else {
          if (chunk.input && chunk.toolCallId) {
            groups.push(chunk);
          } else {
            if (currentGroup.index === chunk.index) {
              currentGroup.input = (currentGroup.input as string) + (chunk.input as string);
            } else {
              const sameIndexGroup = groups.find((group) => group.type === "tool" && group.index === chunk.index);
              if (sameIndexGroup && sameIndexGroup.type === "tool") {
                sameIndexGroup.input = (sameIndexGroup.input as string) + (chunk.input as string);
              } else {
                groups.push(chunk);
              }
            }
          }
        }
      } else {
        groups.push(chunk);
      }
    }
  }
}

// export function useStream(chatId: Id<"chats"> | "new") {
//   // Get stream info
//   const { data: stream } = useQuery({
//     ...convexQuery(
//       api.streams.queries.get,
//       chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
//     ),
//   });

//   // Get all chunks for the stream reactively
//   const { data: chunksResult } = useQuery({
//     ...convexQuery(
//       api.streams.queries.getChunks,
//       stream
//         ? {
//             chatId: stream.chatId,
//             lastChunkTime: undefined, // Get all chunks
//             paginationOpts: { numItems: 1000, cursor: null },
//           }
//         : "skip",
//     ),
//   });

//   // Process and group chunks into messages
//   const groupedChunks = useMemo(() => {
//     if (!chunksResult?.chunks?.page?.length) return [];

//     // Flatten all chunks from all documents and sort by creation time
//     const allChunks = chunksResult.chunks.page
//       .sort((a, b) => a._creationTime - b._creationTime)
//       .flatMap((chunkDoc) =>
//         chunkDoc.chunks.map(
//           (chunkStr: string) => JSON.parse(chunkStr) as ChunkGroup,
//         ),
//       );

//     // Use helper function to group chunks intelligently
//     return groupStreamChunks(allChunks);
//   }, [chunksResult]);

//   // Convert chunk groups to LangChain messages
//   const langchainMessages = useMemo(() => {
//     if (!groupedChunks.length) return [];

//     // Use helper function to convert chunks to LangChain messages
//     return convertChunksToLangChainMessages(groupedChunks);
//   }, [groupedChunks]);

//   // Generate planning steps message
//   const planningStepsMessage = useMemo(() => {
//     if (!stream?.completedSteps || stream.completedSteps.length === 0)
//       return null;

//     return new AIMessage({
//       content: "",
//       additional_kwargs: {
//         pastSteps: [
//           [
//             stream.completedSteps[0],
//             mapChatMessagesToStoredMessages(langchainMessages),
//           ],
//           ...stream.completedSteps.slice(1).map((step: string) => [step, []]),
//         ],
//       },
//     });
//   }, [stream?.completedSteps, langchainMessages]);

//   return {
//     status: stream?.status,
//     langchainMessages,
//     planningStepsMessage,
//   };
// }
