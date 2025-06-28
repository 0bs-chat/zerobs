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

  const { messageMap } = buildMessageLookups(messages);

  // Start from the last message in the list.
  const lastMessage = messages[messages.length - 1];
  const thread: Message[] = [];

  // Traverse up the parent chain to the root.
  let currentMessage: Message | undefined = lastMessage;
  while (currentMessage) {
    thread.push(currentMessage);
    currentMessage = currentMessage.parentId
      ? messageMap.get(currentMessage.parentId)
      : undefined;
  }

  // The thread is built backwards, so reverse it for chronological order.
  return thread.reverse();
}
