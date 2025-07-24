import { memo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { BranchNavigation } from "./branch-navigation";
import { Button } from "@/components/ui/button";
import { CheckCheck, GitBranch, RefreshCcw, Star, X } from "lucide-react";
import { ActionDropdown } from "./action-dropdown";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type {
  MessageWithBranchInfo,
  NavigateBranch,
} from "@/hooks/chats/use-messages";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { CopyButton } from "./copy-button";
import { groupMessages } from "../../../../../convex/chatMessages/helpers";
import { useNavigate } from "@tanstack/react-router";

interface MessageContent {
  type: string;
  text?: string;
}

export const UtilsBar = memo(
  ({
    item,
    isEditing,
    setEditing,
    editedText,
    onDone,
    isAI,
    navigateBranch,
    groupedMessages,
  }: {
    item: MessageWithBranchInfo;
    isEditing?: boolean;
    setEditing?: Dispatch<SetStateAction<string | null>>;
    editedText?: string;
    onDone?: () => void;
    isAI?: boolean;
    navigateBranch: NavigateBranch;
    groupedMessages: ReturnType<typeof groupMessages>;
  }) => {
    const regenerate = useAction(api.langchain.index.regenerate) as unknown as (args: { messageId: Id<"chatMessages">, model?: string }) => Promise<void>;
    const branchChat = useAction(api.langchain.index.branchChat) as unknown as (args: { chatId: Id<"chats">, branchFrom: Id<"chatMessages">, model?: string }) => Promise<{ newChatId: Id<"chats"> }>;
    const updateMessage = useMutation(api.chatMessages.mutations.updateInput);
    const chat = useAction(api.langchain.index.chat);
    const navigate = useNavigate();

    const copyText = (() => {
      const content = item.message.message.content;
      if (!content) return "";

      if (Array.isArray(content)) {
        if (isAI) {
          const response = groupedMessages
            ?.find((group) => group.input.message._id === item.message._id)
            ?.response.map(
              (response) => response.message.message.content as string,
            );
          return response?.join("\n") || "";
        } else {
          const textContent = (content as MessageContent[]).find(
            (entry) => entry.type === "text",
          );
          return textContent?.text || "";
        }
      }
      return typeof content === "string" ? content : "";
    })();

    const handleSubmit = (applySame: boolean) => {
      if (applySame === false) {
        navigateBranch?.(item.depth, item.totalBranches);
      }
      updateMessage({
        id: item.message._id as Id<"chatMessages">,
        updates: { text: editedText!, documents: [] },
        applySame: applySame,
      }).then(() => {
        if (applySame === false) {
          chat({ chatId: item.message.chatId! });
        }
      });
      onDone?.();
    };

    if (isEditing) {
      return (
        <div className="flex flex-row items-center gap-1 self-start">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing?.(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancel</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSubmit(true)}
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Submit</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSubmit(false)}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Submit and Regenerate</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }

    if (isAI) {
      return (
        <div className={`flex flex-row items-center gap-1 self-start`}>
          <BranchNavigation item={item} navigateBranch={navigateBranch!} />
          <ActionDropdown
            trigger={
              <Button variant="ghost" size="icon">
                <GitBranch className="h-4 w-4" />
              </Button>
            }
            actionLabel={<><GitBranch className="h-4 w-4 mr-2" />Branch</>}
            onAction={async () => {
              const result = await branchChat({
                chatId: item.message.chatId!,
                branchFrom: item.message._id,
              });
              navigate({
                to: "/chat/$chatId",
                params: { chatId: result.newChatId },
              });
            }}
            onActionWithModel={async (model) => {
              const result = await branchChat({
                chatId: item.message.chatId!,
                branchFrom: item.message._id,
                model,
              });
              navigate({
                to: "/chat/$chatId",
                params: { chatId: result.newChatId },
              });
            }}
          />
          <ActionDropdown
            trigger={
              <Button variant="ghost" size="icon">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            }
            actionLabel={<><RefreshCcw className="h-4 w-4 mr-2" />Regenerate</>}
            onAction={() => {
              navigateBranch?.(item.depth, item.totalBranches);
              regenerate({ messageId: item.message._id });
            }}
            onActionWithModel={(model) => {
              navigateBranch?.(item.depth, item.totalBranches);
              regenerate({ messageId: item.message._id, model });
            }}
          />
          {copyText && <CopyButton text={copyText} />}
        </div>
      );
    }

    return (
      <div className={`flex flex-row items-center gap-1 self-start`}>
        <BranchNavigation item={item} navigateBranch={navigateBranch!} />
        <ActionDropdown
          trigger={
            <Button variant="ghost" size="icon">
              <GitBranch className="h-4 w-4" />
            </Button>
          }
          actionLabel={<><GitBranch className="h-4 w-4 mr-2" />Branch</>}
          onAction={async () => {
            const result = await branchChat({
              chatId: item.message.chatId!,
              branchFrom: item.message._id,
            });
            if (result && result.newChatId) {
              navigate({
                to: "/chat/$chatId",
                params: { chatId: result.newChatId },
              });
            }
          }}
          onActionWithModel={async (model) => {
            const result = await branchChat({
              chatId: item.message.chatId!,
              branchFrom: item.message._id,
              model,
            });
            if (result && result.newChatId) {
              navigate({
                to: "/chat/$chatId",
                params: { chatId: result.newChatId },
              });
            }
          }}
        />
        <ActionDropdown
          trigger={
            <Button variant="ghost" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          }
          actionLabel={<><RefreshCcw className="h-4 w-4 mr-2" />Regenerate</>}
          onAction={() => {
            navigateBranch?.(item.depth, item.totalBranches);
            regenerate({ messageId: item.message._id });
          }}
          onActionWithModel={(model) => {
            navigateBranch?.(item.depth, item.totalBranches);
            regenerate({ messageId: item.message._id, model });
          }}
        />
        {copyText && <CopyButton text={copyText} />}
      </div>
    );
  },
);

UtilsBar.displayName = "UtilsBar";
