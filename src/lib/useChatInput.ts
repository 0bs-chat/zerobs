import { useMutation } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCallback } from "react";

export function useChatInput(chatId: Id<"chats"> | "new") {
  const chatInput = useQuery(
    api.chatInput.queries.get,
    chatId !== "new" ? { chatId } : "skip"
  );

  const updateChatInput = useMutation(api.chatInput.mutations.update);
  const createChatInput = useMutation(api.chatInput.mutations.create);

  const handleUpdate = useCallback(
    async (updates: any) => {
      if (chatId === "new") return;
      try {
        await updateChatInput({ chatId, updates });
      } catch (error) {
        console.error("Failed to update chat input:", error);
      }
    },
    [chatId, updateChatInput]
  );

  return {
    chatInput,
    handleUpdate,
    createChatInput,
    isNew: chatId === "new",
  };
}
