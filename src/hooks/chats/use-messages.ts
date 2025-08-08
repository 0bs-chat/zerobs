import { useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildMessageTree,
  buildThread,
  type BranchPath,
  type MessageWithBranchInfo,
} from "../../../convex/chatMessages/helpers";
import { useStreamAtom, currentThreadAtom } from "@/store/chatStore";
import { atom, useSetAtom, useAtomValue } from "jotai";
import { useStream } from "./use-stream";

const branchPathAtom = atom<BranchPath>([]);

export type { MessageWithBranchInfo, BranchPath };

export const useMessages = ({ chatId }: { chatId: Id<"chats"> | "new" }) => {
  const setCurrentThread = useSetAtom(currentThreadAtom);
  const setUseStreamAtom = useSetAtom(useStreamAtom);
  const branchPath = useAtomValue(branchPathAtom);

  const {
    data: messages,
    isLoading,
    isError: isMessagesError,
    error: messagesError,
  } = useQuery({
    ...convexQuery(
      api.chatMessages.queries.get,
      chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip"
    ),
    enabled: chatId !== "new",
  });

  const messageTree = useMemo(
    () => (messages ? buildMessageTree(messages) : []),
    [messages]
  );
  const currentThread = useMemo(
    () => buildThread(messageTree, branchPath),
    [messageTree, branchPath]
  );
  const streamData = useStream(chatId);

  useEffect(() => {
    setCurrentThread(currentThread);
    setUseStreamAtom(streamData);
  }, [
    currentThread,
    JSON.stringify(streamData),
    setCurrentThread,
    setUseStreamAtom,
  ]);

  return {
    isLoading: isLoading,
    isEmpty: currentThread.length === 0,
    isError: isMessagesError,
    error: messagesError,
    isStreamError: Boolean((streamData as any)?.isError),
    streamError: (streamData as any)?.error,
  };
};

// Function to change branch at a specific depth
export const useChangeBranch = () => {
  const setBranchPath = useSetAtom(branchPathAtom);
  return useCallback(
    (depth: number, newBranchIndex: number) => {
      setBranchPath((prev) => {
        const newPath = prev.slice(0, depth); // Clear deeper selections
        newPath[depth] = newBranchIndex;
        return newPath;
      });
    },
    [setBranchPath]
  );
};

// Function to navigate branches (prev/next)
export const useNavigateBranch = () => {
  const currentThread = useAtomValue(currentThreadAtom);
  const branchPath = useAtomValue(branchPathAtom);
  const changeBranch = useChangeBranch();

  return useCallback(
    (depth: number, direction: "prev" | "next" | number) => {
      if (typeof direction === "number") {
        changeBranch(depth, direction);
        return;
      }

      const threadItem = currentThread![depth];
      if (!threadItem) return;

      const currentBranchIndex =
        branchPath[depth] ?? threadItem.totalBranches - 1;
      const totalBranches = threadItem.totalBranches;

      const newIndex =
        direction === "prev"
          ? (currentBranchIndex - 1 + totalBranches) % totalBranches
          : (currentBranchIndex + 1) % totalBranches;

      changeBranch(depth, newIndex);
    },
    [currentThread, branchPath, changeBranch]
  );
};
