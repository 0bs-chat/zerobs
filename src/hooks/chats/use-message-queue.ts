import { useAtom } from "jotai";
import { messageQueuesAtom } from "@/store/chatStore";
import type { Id } from "../../../convex/_generated/dataModel";

export interface QueueMessage {
  id: string;
  text: string;
  documents: Array<Id<"documents">>;
  createdAt: number;
}

export interface QueueOperations {
  enqueueMessage: (chatId: string, text: string, documents: Array<Id<"documents">>) => void;
  dequeueMessage: (chatId: string) => QueueMessage | undefined;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Pick<QueueMessage, "text" | "documents">>) => void;
  reorderMessage: (chatId: string, fromIndex: number, toIndex: number) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  getQueue: (chatId: string) => QueueMessage[];
  clearQueue: (chatId: string) => void;
}

export const useMessageQueue = (): QueueOperations => {
  const [queues, setQueues] = useAtom(messageQueuesAtom);

  const enqueueMessage = (chatId: string, text: string, documents: Array<Id<"documents">>) => {
    const message: QueueMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      documents,
      createdAt: Date.now(),
    };

    setQueues((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] ?? []), message],
    }));
  };

  const dequeueMessage = (chatId: string): QueueMessage | undefined => {
    const queue = queues[chatId] ?? [];
    if (queue.length === 0) return undefined;

    const message = queue[0];
    setQueues((prev) => ({
      ...prev,
      [chatId]: queue.slice(1),
    }));

    return message;
  };

  const updateMessage = (
    chatId: string,
    messageId: string,
    updates: Partial<Pick<QueueMessage, "text" | "documents">>
  ) => {
    setQueues((prev) => {
      const queue = [...(prev[chatId] ?? [])];
      const index = queue.findIndex((m) => m.id === messageId);
      if (index >= 0) {
        queue[index] = { ...queue[index], ...updates };
      }
      return { ...prev, [chatId]: queue };
    });
  };

  const reorderMessage = (chatId: string, fromIndex: number, toIndex: number) => {
    setQueues((prev) => {
      const queue = [...(prev[chatId] ?? [])];
      if (fromIndex >= 0 && fromIndex < queue.length && toIndex >= 0 && toIndex < queue.length) {
        const [item] = queue.splice(fromIndex, 1);
        queue.splice(toIndex, 0, item);
      }
      return { ...prev, [chatId]: queue };
    });
  };

  const removeMessage = (chatId: string, messageId: string) => {
    setQueues((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] ?? []).filter((m) => m.id !== messageId),
    }));
  };

  const getQueue = (chatId: string): QueueMessage[] => {
    return queues[chatId] ?? [];
  };

  const clearQueue = (chatId: string) => {
    setQueues((prev) => ({
      ...prev,
      [chatId]: [],
    }));
  };

  return {
    enqueueMessage,
    dequeueMessage,
    updateMessage,
    reorderMessage,
    removeMessage,
    getQueue,
    clearQueue,
  };
};
