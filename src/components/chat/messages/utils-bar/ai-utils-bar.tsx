import { memo } from "react";
import { BranchNavigation } from "./branch-navigation";
import { Button } from "@/components/ui/button";
import { GitBranch, RefreshCcw } from "lucide-react";
import { ActionDropdown } from "./action-dropdown";
import type { MessageWithBranchInfo } from "@/hooks/chats/use-messages";
import { CopyButton } from "./copy-button";
import { useMessageActions } from "./index";

interface MessageContent {
  type: string;
  text?: string;
}

interface AiUtilsBarProps {
  input: MessageWithBranchInfo;
  response: MessageWithBranchInfo[];
}

export const AiUtilsBar = memo(({ input, response }: AiUtilsBarProps) => {
  const { handleBranch, handleRegenerate, navigateBranch } =
    useMessageActions();

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

  return (
    <div
      className={`flex flex-row items-center gap-1 self-start text-foreground/70`}
    >
      <BranchNavigation item={input} navigateBranch={navigateBranch} />
      <ActionDropdown
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground/70 cursor-pointer"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
        }
        actionLabel={
          <>
            <GitBranch className="h-4 w-4 mr-2" />
            Branch
          </>
        }
        onAction={() => handleBranch(input)}
        onActionWithModel={(model) => handleBranch(input, model)}
      />
      <ActionDropdown
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground/70 cursor-pointer"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        }
        actionLabel={
          <>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Regenerate
          </>
        }
        onAction={() => handleRegenerate(input)}
        onActionWithModel={(model) => handleRegenerate(input, model)}
      />
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
});

AiUtilsBar.displayName = "AiUtilsBar";
