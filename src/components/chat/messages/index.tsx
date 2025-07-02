import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useParams } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import type { ParsedMessageNode } from "../../../../convex/chatMessages/helpers";

interface MessageWithBranchInfo {
  message: ParsedMessageNode;
  branchIndex: number;
  totalBranches: number;
}

export const ChatMessages = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats">;
  const messageTree = useQuery(
    api.chatMessages.queries.get,
    chatId !== "new" ? { chatId, getCurrentThread: false } : "skip"
  );

  // State to track selected branch at each depth level
  const [selectedBranches, setSelectedBranches] = useState<Map<number, number>>(new Map());

  // Calculate the current thread with branch information
  const currentThread = useMemo((): MessageWithBranchInfo[] => {
    if (!messageTree || messageTree.length === 0) {
      return [];
    }

    const thread: MessageWithBranchInfo[] = [];
    let currentNodes: ParsedMessageNode[] = messageTree;
    let depth = 0;

    while (currentNodes.length > 0) {
      // Determine which branch to follow at this depth
      const selectedBranchIndex = selectedBranches.get(depth) ?? (currentNodes.length - 1); // Default to most recent (last)
      const actualIndex = Math.min(selectedBranchIndex, currentNodes.length - 1);
      
      const selectedNode = currentNodes[actualIndex];
      
      thread.push({
        message: selectedNode,
        branchIndex: actualIndex + 1, // 1-indexed for display
        totalBranches: currentNodes.length
      });

      // Move to children for next iteration
      currentNodes = selectedNode.children || [];
      depth++;
    }

    return thread;
  }, [messageTree, selectedBranches]);

  // Function to change branch at a specific depth
  const changeBranch = (depth: number, newBranchIndex: number) => {
    const newSelectedBranches = new Map(selectedBranches);
    newSelectedBranches.set(depth, newBranchIndex);
    
    // Clear any deeper selections since changing a branch invalidates deeper choices
    for (let i = depth + 1; i < currentThread.length; i++) {
      newSelectedBranches.delete(i);
    }
    
    setSelectedBranches(newSelectedBranches);
  };

  // Function to navigate branches (prev/next)
  const navigateBranch = (depth: number, direction: 'prev' | 'next') => {
    const currentBranchIndex = selectedBranches.get(depth) ?? (currentThread[depth]?.totalBranches - 1) ?? 0;
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentBranchIndex > 0 ? currentBranchIndex - 1 : currentThread[depth]?.totalBranches - 1;
    } else {
      newIndex = currentBranchIndex < (currentThread[depth]?.totalBranches - 1) ? currentBranchIndex + 1 : 0;
    }
    
    changeBranch(depth, newIndex);
  };

  return (
    <div>
      {currentThread.length > 0 ? (
        <div>
          {currentThread.map((item, depth) => (
            <div key={item.message._id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
              {/* Branch navigation info */}
              {item.totalBranches > 1 && (
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  Branch: {item.branchIndex}/{item.totalBranches}
                  <button 
                    onClick={() => navigateBranch(depth, 'prev')}
                    style={{ marginLeft: '10px', fontSize: '12px' }}
                  >
                    ←
                  </button>
                  <button 
                    onClick={() => navigateBranch(depth, 'next')}
                    style={{ marginLeft: '5px', fontSize: '12px' }}
                  >
                    →
                  </button>
                </div>
              )}
              
              {/* Message content (stringified for now) */}
              <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify({
                  id: item.message._id,
                  creationTime: new Date(item.message._creationTime).toLocaleString(),
                  hasChildren: (item.message.children?.length || 0) > 0,
                  childrenCount: item.message.children?.length || 0,
                  parentId: item.message.parentId,
                  branchInfo: `${item.branchIndex}/${item.totalBranches}`,
                  message: item.message.message
                }, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div>No messages</div>
      )}
    </div>
  )
}