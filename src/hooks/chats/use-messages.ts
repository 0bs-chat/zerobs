import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildMessageTree,
  buildThread,
  groupMessages,
  type BranchPath,
  type MessageWithBranchInfo,
} from "../../../convex/chatMessages/helpers";
import {
  lastChatMessageAtom,
  groupedMessagesAtom,
  useStreamAtom
} from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useStream } from "./use-stream";

export type { MessageWithBranchInfo, BranchPath };

export type NavigateBranch = (
  depth: number,
  direction: "prev" | "next" | number,
) => void;

export const useMessages = ({ chatId }: { chatId: Id<"chats"> | "new" }) => {
  // Fetch message tree from Convex
  const messages = useQuery(
    api.chatMessages.queries.get,
    chatId !== "new" ? { chatId } : "skip",
  );
  const messageTree = useMemo(
    () => (messages ? buildMessageTree(messages) : []),
    [messages],
  );

  // Set up atoms
  const setLastMessageId = useSetAtom(lastChatMessageAtom);
  const setGroupedMessages = useSetAtom(groupedMessagesAtom);
  const setUseStreamAtom = useSetAtom(useStreamAtom);

  // State to track selected branch path (array of indices, one per depth)
  const [branchPath, setBranchPath] = useState<BranchPath>([]);

  // Get stream data
  const streamData = useStream(chatId);

  // Calculate the current thread with branch information
  const currentThread = useMemo(
    () => buildThread(messageTree, branchPath),
    [messageTree, branchPath],
  );

  // Group messages by human message + responses
  const groupedMessages = useMemo(() => {
    return groupMessages(currentThread);
  }, [currentThread]);

  // Update atoms when data changes
  useEffect(() => {
    const thread = buildThread(messageTree, branchPath);
    const lastMessageId = thread.length > 0 ? thread[thread.length - 1].message._id : undefined;

    setLastMessageId(lastMessageId);
    setGroupedMessages(groupedMessages);
    setUseStreamAtom(streamData);
  }, [messageTree, branchPath, groupedMessages, streamData, setLastMessageId, setGroupedMessages, setUseStreamAtom]);

  // Function to change branch at a specific depth
  const changeBranch = useCallback((depth: number, newBranchIndex: number) => {
    setBranchPath((prev) => {
      const newPath = prev.slice(0, depth); // Clear deeper selections
      newPath[depth] = newBranchIndex;
      return newPath;
    });
  }, []);

  // Function to navigate branches (prev/next)
  const navigateBranch: NavigateBranch = useCallback(
    (depth: number, direction: "prev" | "next" | number) => {
      if (typeof direction === "number") {
        changeBranch(depth, direction);
        return;
      }

      const threadItem = currentThread[depth];
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
    [currentThread, branchPath, changeBranch],
  );

  const resetBranches = useCallback(() => {
    setBranchPath([]);
  }, []);

  const getBranchInfo = useCallback(
    (depth: number) => {
      const threadItem = currentThread[depth];
      if (!threadItem) return null;

      return {
        current: threadItem.branchIndex,
        total: threadItem.totalBranches,
        hasBranches: threadItem.totalBranches > 1,
      };
    },
    [currentThread],
  );

  const isOnDefaultPath = branchPath.length === 0;

  const totalBranches = useMemo(() => {
    return currentThread.reduce(
      (sum, item) => sum + (item.totalBranches - 1),
      0,
    );
  }, [currentThread]);

  return {
    // Data
    messageTree,
    currentThread,
    groupedMessages,
    streamData,
    lastMessageId: currentThread[currentThread.length - 1]?.message._id,

    // Actions
    changeBranch,
    navigateBranch,
    resetBranches,

    // Utilities
    getBranchInfo,
    isOnDefaultPath,
    totalBranches,

    // Loading state
    isLoading: messageTree === undefined && chatId !== "new",
    isEmpty: currentThread.length === 0 && chatId !== "new",
  };
};
