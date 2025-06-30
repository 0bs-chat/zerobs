import { Doc, Id } from "../_generated/dataModel";

type Message = Doc<"chatMessages">;

export type MessageNode = Message & {
  children: MessageNode[];
};

export function buildMessageLookups(messages: Message[]) {
  const messageMap = new Map<Id<"chatMessages">, Message>();
  const childrenMap = new Map<Id<"chatMessages">, Message[]>();

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

export function buildMessageTree(messages: Message[]): MessageNode[] {
  const messageMap = new Map<Id<"chatMessages">, MessageNode>();

  for (const message of messages) {
    messageMap.set(message._id, { ...message, children: [] });
  }

  const roots: MessageNode[] = [];

  for (const node of messageMap.values()) {
    if (node.parentId && messageMap.has(node.parentId)) {
      const parent = messageMap.get(node.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  
  return roots;
}

export function getCurrentThread(messages: Message[]): Message[] {
  if (messages.length === 0) {
    return [];
  }

  const { messageMap, childrenMap } = buildMessageLookups(messages);

  // Find the most recent message (first in desc-ordered list)
  const mostRecentMessage = messages[0];
  
  // Find the leaf node in the current thread by traversing down from the most recent message
  // or finding the message with no children if it's already a leaf
  let leafMessage = mostRecentMessage;
  while (childrenMap.has(leafMessage._id) && childrenMap.get(leafMessage._id)!.length > 0) {
    // Get the most recent child (they should be sorted by creation time)
    const children = childrenMap.get(leafMessage._id)!;
    leafMessage = children.reduce((latest, child) => 
      child._creationTime > latest._creationTime ? child : latest
    );
  }

  const thread: Message[] = [];

  // Traverse up the parent chain from the leaf to the root
  let currentMessage: Message | undefined = leafMessage;
  while (currentMessage) {
    thread.push(currentMessage);
    currentMessage = currentMessage.parentId
      ? messageMap.get(currentMessage.parentId)
      : undefined;
  }

  // The thread is built backwards, so reverse it for chronological order
  return thread.reverse();
}
