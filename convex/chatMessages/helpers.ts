import { Doc, Id } from "../_generated/dataModel";
import { mapStoredMessageToChatMessage, type BaseMessage, type StoredMessage } from "@langchain/core/messages";

export type ParsedMessage = Omit<Doc<"chatMessages">, 'message'> & {
  message: BaseMessage;
}
export type ParsedMessageNode = Omit<Doc<"chatMessages">, 'message' | 'children'> & {
  message: BaseMessage;
  children?: ParsedMessageNode[];
}

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

export function buildMessageTree(messages: Doc<"chatMessages">[]): ParsedMessageNode[] {
  if (messages.length === 0) {
    return [];
  }

  const messageMap = new Map<Id<"chatMessages">, ParsedMessageNode>();

  for (const message of messages) {
    messageMap.set(message._id, { ...message, message: mapStoredMessageToChatMessage(JSON.parse(message.message)), children: [] });
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
  
  return roots;
}

export function getCurrentThread(messages: Doc<"chatMessages">[]): ParsedMessage[] {
  if (messages.length === 0) {
    return [];
  }

  const { messageMap, childrenMap } = buildMessageLookups(messages);

  const mostRecentMessage = messages[0];
  
  let leafMessage = mostRecentMessage;
  while (childrenMap.has(leafMessage._id) && childrenMap.get(leafMessage._id)!.length > 0) {
    // Get the most recent child (they should be sorted by creation time)
    const children = childrenMap.get(leafMessage._id)!;
    leafMessage = children.reduce((latest, child) => 
      child._creationTime > latest._creationTime ? child : latest
    );
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

  const parseMessage = (message: Doc<"chatMessages">): ParsedMessage => {
    return {
      ...message,
      message: mapStoredMessageToChatMessage(
        JSON.parse(message.message) as StoredMessage
      ),
    };
  }

  return thread.map(parseMessage).reverse();
}
