import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { useState } from "react";

export const useMessageHandlers = (
  chatId: Id<"chats">,
  messages: BaseMessage[]
) => {
  const removeMessageGroup = useMutation(api.chatMessages.mutations.remove);
  const regenerate = useAction(api.chatMessages.mutations.regenerate);
  const regenerateFromUser = useAction(api.chatMessages.mutations.regenerate);

  const [_copied, setCopied] = useState(false);
  const [_editingMessageIndex, setEditingMessageIndex] = useState<
    number | null
  >(null);

  if (messages.length === 0) return null;

  const firstMessage = messages[0];
  const isUserGroup = firstMessage instanceof HumanMessage;

  // Helper function to extract text content from message
  const extractTextFromContent = (content: any): string => {
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => (item.type === "text" ? item.text : ""))
        .filter(Boolean)
        .join("");
    }
    return String(content);
  };

  const handleCopyText = () => {
    const textToCopy = messages
      .map((m) => extractTextFromContent(m.content))
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteMessage = async () => {
    if (chatId === "new") return;

    try {
      await removeMessageGroup({
        id: messages[0].id as Id<"chatMessages">,
        cascade: false,
      });
    } catch (error) {
      console.error("Failed to delete message group:", error);
    }
  };

  const handleDeleteCascading = async () => {
    if (chatId === "new") return;

    try {
      await removeMessageGroup({
        id: messages[0].id as Id<"chatMessages">,
        cascade: true,
      });
    } catch (error) {
      console.error("Failed to delete cascading messages:", error);
    }
  };

  const handleRegenerate = async () => {
    if (chatId === "new" || isUserGroup) return;

    try {
      await regenerate({
        id: messages[0].id as Id<"chatMessages">,
        chatId: chatId as Id<"chats">,
      });
    } catch (error) {
      console.error("Failed to regenerate message:", error);
    }
  };

  const handleUserRegenerate = async () => {
    if (chatId === "new" || !isUserGroup) return;

    try {
      await regenerateFromUser({
        id: messages[0].id as Id<"chatMessages">,
        chatId: chatId as Id<"chats">,
      });
    } catch (error) {
      console.error("Failed to regenerate from user message:", error);
    }
  };

  const handleEditMessage = (messageIndex: number) => {
    setEditingMessageIndex(messageIndex);
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
  };

  const handleSaveEdit = () => {
    setEditingMessageIndex(null);
  };

  return {
    handleCopyText,
    handleDeleteMessage,
    handleDeleteCascading,
    handleRegenerate,
    handleUserRegenerate,
    handleEditMessage,
    handleCancelEdit,
    handleSaveEdit,
  };
};

export const groupMessages = (messages: BaseMessage[]): BaseMessage[][] => {
  if (messages.length === 0) return [];

  const grouped: BaseMessage[][] = [];
  let currentGroup: BaseMessage[] = [];

  const getGroupType = (message: BaseMessage) => {
    if (message instanceof HumanMessage) return "user";
    if (message instanceof AIMessage || message instanceof ToolMessage)
      return "ai/tool";
    return "other";
  };

  const validMessages = messages.filter(
    (message) => getGroupType(message) !== "other"
  );

  for (const message of validMessages) {
    const messageType = getGroupType(message);

    if (currentGroup.length === 0) {
      currentGroup.push(message);
    } else {
      const currentGroupType = getGroupType(currentGroup[0]);
      if (messageType === currentGroupType) {
        currentGroup.push(message);
      } else {
        grouped.push(currentGroup);
        currentGroup = [message];
      }
    }
  }

  if (currentGroup.length > 0) {
    grouped.push(currentGroup);
  }

  return grouped;
};

export const extractUrlFromTavilyContent = (content: string): string | null => {
  const urlMatch = content.match(/https?:\/\/[^\s\n]+/);
  return urlMatch ? urlMatch[0] : null;
};
