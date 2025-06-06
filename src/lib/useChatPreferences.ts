import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useChatPreferencesStore } from "@/store/useChatPreferencesStore";

export const useChatPreferences = (chatId?: Id<"chats">) => {
  const isNewChat = chatId === "new";

  const chatInput = useQuery(
    api.chatInput.queries.get,
    chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip"
  );
  const updateChatInput = useMutation(api.chatInput.mutations.update);

  const preferences = useChatPreferencesStore((state) => state.preferences);
  const updatePreferencesStore = useChatPreferencesStore(
    (state) => state.updatePreferences
  );

  const updatePreferences = (updates: Partial<typeof preferences>) => {
    if (isNewChat) {
      updatePreferencesStore(updates);
    } else {
      updateChatInput({ chatId: chatId as Id<"chats">, updates });
    }
  };

  return {
    preferences: isNewChat ? preferences : chatInput,
    updatePreferences,
  };
};
