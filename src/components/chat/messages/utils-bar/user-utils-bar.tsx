import { memo } from "react";
import type { Dispatch, SetStateAction, ReactNode } from "react";
import { BranchNavigation } from "./branch-navigation";
import { Button } from "@/components/ui/button";
import {
  Check,
  CheckCheck,
  GitBranch,
  Pencil,
  RefreshCcw,
  X,
} from "lucide-react";
import { ActionDropdown } from "./action-dropdown";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { MessageWithBranchInfo } from "@/hooks/chats/use-messages";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyButton } from "./copy-button";
import { useNavigate } from "@tanstack/react-router";
import { useNavigateBranch } from "@/hooks/chats/use-messages";

interface MessageContent {
  type: string;
  text?: string;
}

// Helper component to reduce tooltip boilerplate
const TooltipButton = ({
  onClick,
  icon,
  tooltip,
  ariaLabel,
}: {
  onClick: () => void;
  icon: ReactNode;
  tooltip: string;
  ariaLabel?: string;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={ariaLabel}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

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

interface UserUtilsBarProps {
  input: MessageWithBranchInfo;
  isEditing?: boolean;
  setEditing?: Dispatch<SetStateAction<string | null>>;
  editedText?: string;
  editedDocuments?: Id<"documents">[];
  onDone?: () => void;
}

export const UserUtilsBar = memo(
  ({
    input,
    isEditing,
    setEditing,
    editedText,
    editedDocuments,
    onDone,
  }: UserUtilsBarProps) => {
    const regenerate = useAction(api.langchain.index.regenerate);
    const branchChat = useAction(api.langchain.index.branchChat);
    const updateMessage = useMutation(api.chatMessages.mutations.updateInput);
    const chat = useAction(api.langchain.index.chat);
    const navigate = useNavigate();
    const navigateBranch = useNavigateBranch();

    const copyText = (() => {
      const content = input?.message.message.content;
      if (!content) return "";

      if (Array.isArray(content)) {
        const textContent = (content as MessageContent[]).find(
          (entry) => entry.type === "text",
        );
        return textContent?.text || "";
      }
      return typeof content === "string" ? content : "";
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
      navigateBranch?.(input.depth, input.totalBranches);
      regenerate({
        messageId: input.message._id,
        ...(model && { model }),
      });
    };

    const handleSubmit = (applySame: boolean) => {
      if (applySame === false) {
        navigateBranch?.(input.depth, input.totalBranches);
      }
      updateMessage({
        id: input.message._id as Id<"chatMessages">,
        updates: { text: editedText!, documents: editedDocuments || [] },
        applySame: applySame,
      }).then(() => {
        if (applySame === false) {
          chat({ chatId: input.message.chatId! });
        }
      });
      onDone?.();
    };

    if (isEditing) {
      return (
        <div className="flex flex-row items-center gap-1 self-start">
          <TooltipButton
            onClick={() => setEditing?.(null)}
            icon={<X className="h-4 w-4" />}
            tooltip="Cancel"
          />
          <TooltipButton
            onClick={() => handleSubmit(true)}
            icon={<Check className="h-4 w-4" />}
            tooltip="Submit"
          />
          <TooltipButton
            onClick={() => handleSubmit(false)}
            icon={<CheckCheck className="h-4 w-4" />}
            tooltip="Submit and Regenerate"
          />
        </div>
      );
    }

    return (
      <div className={`flex flex-row items-center gap-1 self-start`}>
        <BranchNavigation item={input} navigateBranch={navigateBranch!} />
        {setEditing && (
          <TooltipButton
            onClick={() => setEditing(input.message._id)}
            icon={<Pencil className="h-4 w-4" />}
            tooltip="Edit"
            ariaLabel="Edit"
          />
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
  },
);

UserUtilsBar.displayName = "UserUtilsBar";
