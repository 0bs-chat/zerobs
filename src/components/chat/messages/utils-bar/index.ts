import { useAction } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../../../../../convex/_generated/api";
import type { MessageWithBranchInfo } from "@/hooks/chats/use-messages";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useNavigateBranch } from "@/hooks/chats/use-messages";
export { UserUtilsBar } from "./user-utils-bar";
export { AiUtilsBar } from "./ai-utils-bar";

// Helper function for navigation logic
const navigateToChat = (
  navigate: ReturnType<typeof useNavigate>,
  chatId: Id<"chats">,
) => {
  navigate({
    to: "/chat/$chatId",
    params: { chatId },
  });
};

export function useMessageActions() {
  const regenerate = useAction(api.langchain.index.regenerate);
  const branchChat = useAction(api.langchain.index.branchChat);
  const chat = useAction(api.langchain.index.chat);
  const navigate = useNavigate();
  const navigateBranch = useNavigateBranch();

  const handleBranch = async (input: MessageWithBranchInfo, model?: string) => {
    const result = await branchChat({
      chatId: input.message.chatId!,
      branchFrom: input.message._id,
      ...(model && { model }),
    });
    if (result?.newChatId) {
      // Only trigger regeneration if a model is explicitly selected
      if (model) {
        chat({
          chatId: result.newChatId,
          model: model,
        });
      }
      navigateToChat(navigate, result.newChatId);
    }
  };

  const handleRegenerate = (input: MessageWithBranchInfo, model?: string) => {
    navigateBranch?.(input.depth, input.totalBranches);
    regenerate({
      messageId: input.message._id,
      ...(model && { model }),
    });
  };

  return {
    handleBranch,
    handleRegenerate,
    navigate,
    navigateBranch,
  };
}
