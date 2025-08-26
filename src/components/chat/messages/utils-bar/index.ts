import { useAction } from "convex/react";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
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
  chatId: Id<"chats">
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
  const { mutateAsync: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });

  const handleBranch = async (
    input: MessageWithBranchInfo, 
    model?: string,
    editedContent?: { text?: string; documents?: Id<"documents">[] }
  ) => {
    const result = await branchChat({
      chatId: input.message.chatId!,
      branchFrom: input.message._id,
      ...(model && { model }),
      ...(editedContent && { editedContent }),
    });
    if (result?.newChatId) {
      // Model is already persisted by branchChat; start chat without forwarding model
      chat({
        chatId: result.newChatId,
      });
      navigateToChat(navigate, result.newChatId);
    }
  };

  const handleRegenerate = async (
    input: MessageWithBranchInfo,
    model?: string
  ) => {
    navigateBranch?.(input.depth, input.totalBranches, input.totalBranches + 1);
    // If the model is provided, update the chat with the new model
    if (model) {
      await updateChatMutation({
        chatId: input.message.chatId!,
        updates: { model },
      });
    }
    await regenerate({
      messageId: input.message._id,
    });
  };

  return {
    handleBranch,
    handleRegenerate,
    navigate,
    navigateBranch,
  };
}
