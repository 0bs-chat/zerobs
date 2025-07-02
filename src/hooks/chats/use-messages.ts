import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { buildMessageTree, type ParsedMessageNode } from "../../../convex/chatMessages/helpers";

interface MessageWithBranchInfo {
  message: ParsedMessageNode;
  branchIndex: number;
  totalBranches: number;
  depth: number;
}

interface UseMessagesOptions {
  chatId: Id<"chats"> | "new";
}

type BranchPath = number[]; // index per depth, empty = default path

// Recursive helper to build the current thread
const buildThread = (
  nodes: ParsedMessageNode[] | undefined,
  path: BranchPath,
  depth = 0,
): MessageWithBranchInfo[] => {
  if (!nodes || nodes.length === 0) return [];

  const idx = Math.min(path[depth] ?? nodes.length - 1, nodes.length - 1);
  const node = nodes[idx];

  return [
    {
      message: node,
      branchIndex: idx + 1, // 1-indexed for display
      totalBranches: nodes.length,
      depth,
    },
    ...buildThread(node.children, path, depth + 1),
  ];
};

export const useMessages = ({ chatId }: UseMessagesOptions) => {
  // Fetch message tree from Convex
  const messages = useQuery(
    api.chatMessages.queries.get,
    chatId !== "new" ? { chatId } : "skip"
  );
  const messageTree = useMemo(() => messages ? buildMessageTree(messages) : [], [messages]);

  // State to track selected branch path (array of indices, one per depth)
  const [branchPath, setBranchPath] = useState<BranchPath>([]);

  // Calculate the current thread with branch information
  const currentThread = useMemo(
    () => buildThread(messageTree, branchPath),
    [messageTree, branchPath]
  );

  // Function to change branch at a specific depth
  const changeBranch = useCallback((depth: number, newBranchIndex: number) => {
    setBranchPath(prev => {
      const newPath = prev.slice(0, depth); // Clear deeper selections
      newPath[depth] = newBranchIndex;
      return newPath;
    });
  }, []);

  // Function to navigate branches (prev/next)
  const navigateBranch = useCallback((depth: number, direction: 'prev' | 'next') => {
    const threadItem = currentThread[depth];
    if (!threadItem) return;

    const currentBranchIndex = branchPath[depth] ?? (threadItem.totalBranches - 1);
    const totalBranches = threadItem.totalBranches;
    
    const newIndex = direction === 'prev'
      ? (currentBranchIndex - 1 + totalBranches) % totalBranches
      : (currentBranchIndex + 1) % totalBranches;
    
    changeBranch(depth, newIndex);
  }, [currentThread, branchPath, changeBranch]);

  // Function to reset all branch selections (go back to default - most recent path)
  const resetBranches = useCallback(() => {
    setBranchPath([]);
  }, []);

  // Function to get branch info for a specific depth
  const getBranchInfo = useCallback((depth: number) => {
    const threadItem = currentThread[depth];
    if (!threadItem) return null;

    return {
      current: threadItem.branchIndex,
      total: threadItem.totalBranches,
      hasBranches: threadItem.totalBranches > 1
    };
  }, [currentThread]);

  // Check if currently on the default (most recent) path
  const isOnDefaultPath = branchPath.length === 0;

  // Get total number of alternative branches across all levels
  const totalBranches = useMemo(() => {
    return currentThread.reduce((sum, item) => sum + (item.totalBranches - 1), 0);
  }, [currentThread]);

  return {
    // Data
    messageTree,
    currentThread,
    selectedBranches: branchPath, // Keep for compatibility, but now it's an array
    
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
    isEmpty: currentThread.length === 0 && chatId !== "new"
  };
};

export const groupMessages = (messages: ParsedMessageNode[]) => {
  
}