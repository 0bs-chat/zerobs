import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildThreadAndGroups,
  type MessageGroup,
  type MessageWithBranchInfo,
} from "../../../convex/chatMessages/helpers";
import { useStreamAtom, currentThreadAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { useStream } from "./use-stream";

export type { MessageGroup, MessageWithBranchInfo };

let globalBranchPath: number[] = [];
let forceUpdateFn: (() => void) | null = null;
let userSelectedPath = false;

const pathsEqual = (a: number[], b: number[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
};

export const useMessages = ({ chatId }: { chatId: Id<"chats"> | "new" }) => {
  const setCurrentThread = useSetAtom(currentThreadAtom);
  const setUseStreamAtom = useSetAtom(useStreamAtom);
  const [counter, setCounter] = useState(0);

  // Register the force update function
  forceUpdateFn = () => setCounter((c) => c + 1);

  const { data: messages, isLoading } = useQuery({
    ...convexQuery(
      api.chatMessages.queries.get,
      chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
    ),
    enabled: chatId !== "new",
  });

  const { messageGroups, latestPath } = useMemo(() => {
    if (!messages) return { messageGroups: [], latestPath: [] };
    const result = buildThreadAndGroups(messages, globalBranchPath);
    return { messageGroups: result.groups, latestPath: result.latestPath };
  }, [messages, counter]);

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

  // Auto-select the branch path that ends at the latest message
  // unless the user has manually picked a branch.
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    if (userSelectedPath) return;
    
    // Update global path if different
    if (!pathsEqual(globalBranchPath, latestPath)) {
      // copy to avoid accidental external mutation
      globalBranchPath = latestPath.slice();
      setCounter((c) => c + 1);
    }
  }, [messages, latestPath]);

  useEffect(() => {
    // Reset branch path when chat changes
    globalBranchPath = [];
    userSelectedPath = false;
    setCounter((c) => c + 1);
  }, [chatId]);

  return {
    isLoading: isLoading,
    isEmpty: messageGroups.length === 0,
  };
};

export const useNavigateBranch = () => {
  return useCallback(
    (
      depth: number,
      direction: "prev" | "next" | number,
      totalBranches: number,
    ) => {
      userSelectedPath = true;
      if (typeof direction === "number") {
        globalBranchPath[depth] = direction;
      } else {
        const currentIndex = globalBranchPath[depth] ?? (totalBranches - 1); // Default to current displayed branch
        if (direction === "next") {
          globalBranchPath[depth] = (currentIndex + 1) % totalBranches;
        } else if (direction === "prev") {
          globalBranchPath[depth] =
            (currentIndex - 1 + totalBranches) % totalBranches;
        }
      }
      globalBranchPath.splice(depth + 1);

      if (forceUpdateFn) {
        forceUpdateFn();
      }
    },
    [],
  );
};

export const useChangeBranch = () => {
  return useCallback((depth: number, newBranchIndex: number) => {
    userSelectedPath = true;
    globalBranchPath[depth] = newBranchIndex;
    globalBranchPath.splice(depth + 1);

    if (forceUpdateFn) {
      forceUpdateFn();
    }
  }, []);
};