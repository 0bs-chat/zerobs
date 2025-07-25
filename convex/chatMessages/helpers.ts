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
export type MessageNode = Omit<
  Doc<"chatMessages">,
  "message" | "children"
> & {
  message: BaseMessage;
  children: MessageNode[];
};

export interface MessageWithBranchInfo {
  message: MessageNode;
  branchIndex: number;
  totalBranches: number;
  depth: number;
}

export type BranchPath = number[];

export type MessageGroup = {
  input: MessageWithBranchInfo;
  response: MessageWithBranchInfo[];
};

// Recursive helper to build the current thread
export const buildThread = (
  nodes: MessageNode[],
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

export const groupMessages = (currentThread: MessageWithBranchInfo[]) => {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  currentThread.forEach((item, index, array) => {
    const messageType = item.message.message.getType();

    if (messageType === "human") {
      // Start a new group with this human message
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        input: item,
        response: [],
      };
    } else if (messageType === "ai" || messageType === "tool") {
      // Add to current group's responses
      if (currentGroup) {
        if (item.message.message.getType() === "tool") {
          const prevItem = index > 0 ? array[index - 1] : null;
          if (
            prevItem &&
            prevItem.message.message.getType() === "ai" &&
            (prevItem.message.message as AIMessage).tool_calls
          ) {
            const toolCallId = (item.message.message as ToolMessage)
              .tool_call_id;
            const toolCall = (
              prevItem.message.message as AIMessage
            ).tool_calls?.find((tc) => tc.id === toolCallId);

            if (toolCall) {
              item.message.message.additional_kwargs = {
                ...item.message.message.additional_kwargs,
                input: toolCall.args,
              };
            }
          }
        }
        currentGroup.response.push(item);
      }
    }
  });

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
};
