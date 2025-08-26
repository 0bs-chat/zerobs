import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildThreadAndGroups,
  type MessageGroup,
  type MessageWithBranchInfo,
  type BranchPath,
} from "../../../convex/chatMessages/helpers";
import { useStreamAtom, currentThreadAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { useStream } from "./use-stream";

export type { MessageGroup, MessageWithBranchInfo, BranchPath };

export const useMessages = ({ chatId }: { chatId: Id<"chats"> | "new" }) => {
  const setCurrentThread = useSetAtom(currentThreadAtom);
  const setUseStreamAtom = useSetAtom(useStreamAtom);

  const { data: messages, isLoading } = useQuery({
    ...convexQuery(
      api.chatMessages.queries.get,
      chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
    ),
    enabled: chatId !== "new",
  });

  // Use optimized single-pass processing
  const messageGroups = useMemo(
    () => (messages ? buildThreadAndGroups(messages) : []),
    [messages],
  );

  const streamData = useStream(chatId);

  useEffect(() => {
    setCurrentThread(messageGroups);
    setUseStreamAtom(streamData);
  }, [
    messageGroups,
    JSON.stringify(streamData),
    setCurrentThread,
    setUseStreamAtom,
  ]);

  return {
    isLoading: isLoading,
    isEmpty: messageGroups.length === 0,
  };
};

// Legacy branch navigation functions - kept as stubs for compatibility
export const useNavigateBranch = () => {
  return useCallback(
    (_depth: number, _direction: "prev" | "next" | number) => {
      // No-op: linear processing doesn't need branch navigation
      console.warn("Branch navigation is no longer supported with optimized linear processing");
    },
    [],
  );
};

export const useChangeBranch = () => {
  return useCallback(
    (_depth: number, _newBranchIndex: number) => {
      // No-op: linear processing doesn't need branch changes
      console.warn("Branch changing is no longer supported with optimized linear processing");
    },
    [],
  );
};
