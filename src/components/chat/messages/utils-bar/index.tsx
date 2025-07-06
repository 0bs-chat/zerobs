import { memo } from "react";
import type { Dispatch, SetStateAction } from 'react';
import { BranchNavigation } from "./branch-navigation";
import { Button } from "@/components/ui/button";
import { CheckCheck, PenSquare, RefreshCcw, Star, X } from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { MessageWithBranchInfo, NavigateBranch } from "@/hooks/chats/use-messages";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { CopyButton } from "./copy-button";

interface MessageContent {
  type: string;
  text?: string;
}

export const UtilsBar = memo(({ 
  item, 
  humanVersionOfItemForBranching,
  navigateBranch, 
  isEditing, 
  setEditing,
  editedText,
  onDone,
}: {
  item: MessageWithBranchInfo,
  humanVersionOfItemForBranching?: MessageWithBranchInfo,
  navigateBranch: NavigateBranch,
  isEditing: boolean;
  setEditing: Dispatch<SetStateAction<string | null>>;
  editedText: string;
  onDone: () => void;
}) => {
  const regenerate = useAction(api.langchain.index.regenerate);
  const updateMessage = useMutation(api.chatMessages.mutations.updateInput);
  const chat = useAction(api.langchain.index.chat);
  const messageType = item.message.message.getType();
  const branchingItem = humanVersionOfItemForBranching ?? item;

  // Get the text content for copying
  const copyText = (() => {
    const content = item.message.message.content;
    if (!content) return "";
    
    if (Array.isArray(content)) {
      if (messageType === 'ai') {
        // For AI messages, join all text content, skipping tool messages
        return (content as MessageContent[])
          .filter(entry => entry.type === "text" && entry.text)
          .map(entry => entry.text!)
          .join("\n");
      } else {
        // For user messages, take the first text content
        const textContent = (content as MessageContent[]).find(entry => entry.type === "text");
        return textContent?.text || "";
      }
    }
    return typeof content === 'string' ? content : '';
  })();

  const handleSubmit = (applySame: boolean) => {
    if (applySame === false) {
      navigateBranch(branchingItem.depth, branchingItem.totalBranches);
    }
    updateMessage({
      id: item.message._id as Id<'chatMessages'>,
      updates: { text: editedText },
      applySame: applySame,
    }).then(() => {
        if (applySame === false) {
            chat({ chatId: item.message.chatId! });
        }
    });
    onDone();
  }

  if (isEditing) {
    return (
      <div className="flex flex-row items-center gap-1 self-start">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleSubmit(true)}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Submit</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleSubmit(false)}>
                <Star className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Submit and Regenerate</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  if (messageType === 'ai') {
    return (
      <div className={`flex flex-row items-center gap-1 self-start`}>
        <BranchNavigation item={item} navigateBranch={navigateBranch} />
        <Button variant="ghost" size="icon" onClick={() => {
          navigateBranch(branchingItem.depth, branchingItem.totalBranches);
          regenerate({ messageId: item.message._id });
        }}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
        {copyText && <CopyButton text={copyText} />}
      </div>
    )
  }

  return (
    <div className={`flex flex-row items-center gap-1 self-start`}>
      <BranchNavigation item={item} navigateBranch={navigateBranch} />
      <Button variant="ghost" size="icon" onClick={() => setEditing(item.message._id)}>
        <PenSquare className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => {
        navigateBranch(branchingItem.depth, branchingItem.totalBranches);
        regenerate({ messageId: item.message._id });
      }}>
        <RefreshCcw className="h-4 w-4" />
      </Button>
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
});

UtilsBar.displayName = "UtilsBar";
