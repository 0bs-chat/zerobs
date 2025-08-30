import { useCallback } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import {
  newChatAtom,
  chatAtom,
  chatIdAtom,
} from "@/store/chatStore";
import { AGENT_SETTINGS, type AgentSettingKey } from "@/components/chat/input/toolbar/agent-popover";

export function useAgentSettings() {
  const chatId = useAtomValue(chatIdAtom);
  const chat = useAtomValue(chatAtom);
  const setNewChat = useSetAtom(newChatAtom);
  const { mutate: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });

  const isNewChat = !chatId || chatId === "new";

  const handleToggle = useCallback((key: AgentSettingKey, value?: boolean) => {
    const currentValue = chat?.[key] || false;
    const newValue = value !== undefined ? value : !currentValue;

    // Special handling for orchestrator mode - auto-enable webSearch
    const updates: Partial<Record<AgentSettingKey, boolean>> = {
      [key]: newValue,
    };

    if (key === "orchestratorMode" && newValue) {
      updates.webSearch = true;
    }

    if (isNewChat) {
      setNewChat((prev) => ({
        ...prev,
        ...updates,
      }));
    } else {
      updateChatMutation({
        chatId,
        updates,
      });
    }
  }, [chat, isNewChat, setNewChat, updateChatMutation, chatId]);

  const getEnabledSettings = useCallback(() => {
    return AGENT_SETTINGS.filter(setting => chat?.[setting.key] || false);
  }, [chat]);

  return {
    handleToggle,
    getEnabledSettings,
    chat,
    chatId,
  };
}