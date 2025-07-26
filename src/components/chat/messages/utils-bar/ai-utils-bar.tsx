import { memo } from "react";
import { BranchNavigation } from "./branch-navigation";
import { Button } from "@/components/ui/button";
import { GitBranch, RefreshCcw } from "lucide-react";
import { ActionDropdown } from "./action-dropdown";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { MessageWithBranchInfo } from "@/hooks/chats/use-messages";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { CopyButton } from "./copy-button";
import { useNavigate } from "@tanstack/react-router";
import { useNavigateBranch } from "@/hooks/chats/use-messages";

interface MessageContent {
  type: string;
  text?: string;
}

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

interface AiUtilsBarProps {
  input: MessageWithBranchInfo;
  response: MessageWithBranchInfo[];
}

export const AiUtilsBar = memo(({ input, response }: AiUtilsBarProps) => {
  const regenerate = useAction(api.langchain.index.regenerate);
  const branchChat = useAction(api.langchain.index.branchChat);
  const navigate = useNavigate();
  const navigateBranch = useNavigateBranch();

  const copyText = (() => {
    if (!response || response.length === 0) return "";

    const responseTexts = response
      .map((res) => {
        const content = res.message.message.content;
        if (!content) return "";

        if (Array.isArray(content)) {
          const textContent = (content as MessageContent[]).find(
            (entry) => entry.type === "text",
          );
          return textContent?.text || "";
        }
        return typeof content === "string" ? content : "";
      })
      .filter(Boolean);

    return responseTexts.join("\n");
  })();

  // Helper functions for common actions
  const handleBranch = async (model?: string) => {
    const result = await branchChat({
      chatId: input.message.chatId!,
      branchFrom: input.message._id,
      ...(model && { model }),
    });
    if (result?.newChatId) {
      navigateToChat(navigate, result.newChatId);
    }
  };

  const handleRegenerate = (model?: string) => {
    // Use the first response item for navigation context
    const firstResponse = response[0];
    if (firstResponse) {
      navigateBranch?.(firstResponse.depth, firstResponse.totalBranches);
    }
    regenerate({
      messageId: input.message._id,
      ...(model && { model }),
    });
  };

  // Use the first response item for branch navigation
  const firstResponse = response[0];

  return (
    <div className={`flex flex-row items-center gap-1 self-start`}>
      {firstResponse && (
        <BranchNavigation item={firstResponse} navigateBranch={navigateBranch!} />
      )}
      <ActionDropdown
        trigger={
          <Button variant="ghost" size="icon">
            <GitBranch className="h-4 w-4" />
          </Button>
        }
        actionLabel={
          <>
            <GitBranch className="h-4 w-4 mr-2" />
            Branch
          </>
        }
        onAction={() => handleBranch()}
        onActionWithModel={handleBranch}
      />
      <ActionDropdown
        trigger={
          <Button variant="ghost" size="icon">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        }
        actionLabel={
          <>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Regenerate
          </>
        }
        onAction={() => handleRegenerate()}
        onActionWithModel={handleRegenerate}
      />
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
});

AiUtilsBar.displayName = "AiUtilsBar";
