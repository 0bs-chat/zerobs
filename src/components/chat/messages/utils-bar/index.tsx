import { memo } from "react";
import type { Dispatch, SetStateAction } from 'react';
import { BranchNavigation, type BranchNavigationProps } from "./branch-navigation";
import { Button } from "@/components/ui/button";
import { CheckCheck, PenSquare, RefreshCcw, Star, X } from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { MessageWithBranchInfo } from "@/hooks/chats/use-messages";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const UtilsBar = memo(({ 
  item, 
  navigateBranch, 
  isEditing, 
  setEditing,
  editedText,
  onDone,
}: {
  item: MessageWithBranchInfo,
  navigateBranch: BranchNavigationProps["navigateBranch"],
  isEditing: boolean;
  setEditing: Dispatch<SetStateAction<string | null>>;
  editedText: string;
  onDone: () => void;
}) => {
  const regenerate = useAction(api.langchain.index.regenerate);
  const updateMessage = useMutation(api.chatMessages.mutations.updateInput);
  const messageType = item.message.message.getType();

  const handleSubmit = (applySame: boolean) => {
    updateMessage({
      id: item.message._id as Id<'chatMessages'>,
      updates: { text: editedText },
      applySame: applySame,
    }).then(() => {
        if (applySame === false) {
            regenerate({ messageId: item.message._id });
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
        <Button variant="ghost" size="icon" onClick={() => regenerate({ messageId: item.message._id })}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex flex-row items-center gap-1 self-start`}>
      <BranchNavigation item={item} navigateBranch={navigateBranch} />
      <Button variant="ghost" size="icon" onClick={() => setEditing(item.message._id)}>
        <PenSquare className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => regenerate({ messageId: item.message._id })}>
        <RefreshCcw className="h-4 w-4" />
      </Button>
    </div>
  );
});

UtilsBar.displayName = "UtilsBar";
