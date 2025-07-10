import type { Doc, Id } from "../_generated/dataModel";
import {
  mapStoredMessageToChatMessage,
  type BaseMessage,
  type StoredMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";

export type ParsedMessage = Omit<Doc<"chatMessages">, "message"> & {
  message: BaseMessage;
};
export type ParsedMessageNode = Omit<
  Doc<"chatMessages">,
  "message" | "children"
> & {
  message: BaseMessage;
  children?: ParsedMessageNode[];
};

export interface MessageWithBranchInfo {
  message: ParsedMessageNode;
  branchIndex: number;
  totalBranches: number;
  depth: number;
}

export type BranchPath = number[]; // index per depth, empty = default path

// Recursive helper to build the current thread
export const buildThread = (
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

export const groupMessages = (currentThread: MessageWithBranchInfo[]) => {
  type MessageGroup = {
    input: MessageWithBranchInfo;
    response: MessageWithBranchInfo[];
  };

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

export function buildMessageLookups(messages: Doc<"chatMessages">[]) {
  const messageMap = new Map<Id<"chatMessages">, Doc<"chatMessages">>();
  const childrenMap = new Map<Id<"chatMessages">, Doc<"chatMessages">[]>();

  for (const message of messages) {
    messageMap.set(message._id, message);

    if (message.parentId) {
      if (!childrenMap.has(message.parentId)) {
        childrenMap.set(message.parentId, []);
      }
      childrenMap.get(message.parentId)!.push(message);
    }
  }

  return { messageMap, childrenMap };
}

export function buildMessageTree(
  messages: Doc<"chatMessages">[],
): ParsedMessageNode[] {
  if (messages.length === 0) {
    return [];
  }

  const messageMap = new Map<Id<"chatMessages">, ParsedMessageNode>();

  for (const message of messages) {
    messageMap.set(message._id, {
      ...message,
      message: mapStoredMessageToChatMessage(JSON.parse(message.message)),
      children: [],
    });
  }

  const roots: ParsedMessageNode[] = [];

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
  messageMap: Map<Id<"chatMessages">, Doc<"chatMessages">>,
): ParsedMessage[] {
  const thread: Doc<"chatMessages">[] = [];

  // Traverse up the parent chain from the leaf to the root
  let currentMessage: Doc<"chatMessages"> | undefined = leafMessage;
  while (currentMessage) {
    thread.push(currentMessage);
    currentMessage = currentMessage.parentId
      ? messageMap.get(currentMessage.parentId)
      : undefined;
  }

  const parseMessage = (message: Doc<"chatMessages">): ParsedMessage => {
    return {
      ...message,
      message: mapStoredMessageToChatMessage(
        JSON.parse(message.message) as StoredMessage,
      ),
    };
  };

  return thread.map(parseMessage).reverse();
}

export function getCurrentThread(
  messages: Doc<"chatMessages">[],
): ParsedMessage[] {
  if (messages.length === 0) {
    return [];
  }

  const { messageMap, childrenMap } = buildMessageLookups(messages);

  const mostRecentMessage = messages[0];

  let leafMessage = mostRecentMessage;
  while (
    childrenMap.has(leafMessage._id) &&
    childrenMap.get(leafMessage._id)!.length > 0
  ) {
    // Get the most recent child (they should be sorted by creation time)
    const children = childrenMap.get(leafMessage._id)!;
    leafMessage = children.reduce((latest, child) =>
      child._creationTime > latest._creationTime ? child : latest,
    );
  }

  return getThreadFromMessage(leafMessage, messageMap);
}
