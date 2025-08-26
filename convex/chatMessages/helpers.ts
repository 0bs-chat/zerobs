import type { Doc, Id } from "../_generated/dataModel";
import {
  mapStoredMessageToChatMessage,
  type BaseMessage,
  type StoredMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";

export type Message = Omit<Doc<"chatMessages">, "message"> & {
  message: BaseMessage;
};
export type MessageNode = Omit<Doc<"chatMessages">, "message" | "children"> & {
  message: BaseMessage;
  children: MessageNode[];
};

export interface MessageWithBranchInfo {
  message: MessageNode;
  branchIndex: number;
  totalBranches: number;
  depth: number;
}

// Legacy type - kept for compatibility
export type BranchPath = number[];

export type MessageGroup = {
  input: MessageWithBranchInfo;
  response: MessageWithBranchInfo[];
};

// Optimized: Build thread and groups in a single pass - O(n)
export const buildThreadAndGroups = (
  messages: Doc<"chatMessages">[]
): MessageGroup[] => {
  if (messages.length === 0) return [];

  // Parse and sort messages by creation time - O(n log n)
  const parsedMessages = messages
    .map((msg, index) => ({
      ...msg,
      message: mapStoredMessageToChatMessage(JSON.parse(msg.message)),
      originalIndex: index
    }))
    .sort((a, b) => a._creationTime - b._creationTime);

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;
  
  // Build tool call lookup map for current AI message - O(1) lookup
  let currentToolCallMap = new Map<string, any>();

  // Single pass processing - O(n)
  for (let i = 0; i < parsedMessages.length; i++) {
    const msg = parsedMessages[i];
    const messageType = msg.message.getType();
    const branchInfo: MessageWithBranchInfo = {
      message: { ...msg, children: [] },
      branchIndex: 1,
      totalBranches: 1,
      depth: messageType === "human" ? 0 : 1,
    };

    if (messageType === "human") {
      // Start new group
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { input: branchInfo, response: [] };
      currentToolCallMap.clear();
      
    } else if (messageType === "ai") {
      if (currentGroup) {
        // Build tool call lookup map for O(1) access
        const aiMsg = msg.message as AIMessage;
        if (aiMsg.tool_calls) {
          currentToolCallMap.clear();
          aiMsg.tool_calls.forEach(tc => {
            if (tc.id) {
              currentToolCallMap.set(tc.id, tc.args);
            }
          });
        }
        currentGroup.response.push(branchInfo);
      }
      
    } else if (messageType === "tool") {
      if (currentGroup) {
        // O(1) tool call lookup instead of O(k) search
        const toolMsg = msg.message as ToolMessage;
        if (toolMsg.tool_call_id && currentToolCallMap.has(toolMsg.tool_call_id)) {
          toolMsg.additional_kwargs = {
            ...toolMsg.additional_kwargs,
            input: currentToolCallMap.get(toolMsg.tool_call_id)!,
          };
        }
        currentGroup.response.push(branchInfo);
      }
    }
  }

  if (currentGroup) groups.push(currentGroup);
  return groups;
};

// Legacy buildMessageTree kept for getThreadFromMessage compatibility 
export function buildMessageTree(
  messages: Doc<"chatMessages">[],
): MessageNode[] {
  if (messages.length === 0) {
    return [];
  }

  const messageMap = new Map<Id<"chatMessages">, MessageNode>();

  for (const message of messages) {
    messageMap.set(message._id, {
      ...message,
      message: mapStoredMessageToChatMessage(JSON.parse(message.message)),
      children: [],
    });
  }

  const roots: MessageNode[] = [];

  for (const node of messageMap.values()) {
    if (node.parentId && messageMap.has(node.parentId)) {
      const parent = messageMap.get(node.parentId)!;
      (parent.children ?? []).push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by creation time to ensure consistent ordering
  for (const node of messageMap.values()) {
    if (node.children) {
      node.children.sort((a, b) => a._creationTime - b._creationTime);
    }
  }

  return roots;
}

export function getThreadFromMessage(
  leafMessage: Doc<"chatMessages">,
  messages: Doc<"chatMessages">[],
): Message[] {
  // Inline buildMessageLookups logic
  const messageMap = new Map<Id<"chatMessages">, Doc<"chatMessages">>();
  for (const message of messages) {
    messageMap.set(message._id, message);
  }
  const thread: Doc<"chatMessages">[] = [];

  // Traverse up the parent chain from the leaf to the root
  let currentMessage: Doc<"chatMessages"> | undefined = leafMessage;
  while (currentMessage) {
    thread.push(currentMessage);
    currentMessage = currentMessage.parentId
      ? messageMap.get(currentMessage.parentId)
      : undefined;
  }

  const parseMessage = (message: Doc<"chatMessages">): Message => {
    return {
      ...message,
      message: mapStoredMessageToChatMessage(
        JSON.parse(message.message) as StoredMessage,
      ),
    };
  };

  return thread.map(parseMessage).reverse();
}

