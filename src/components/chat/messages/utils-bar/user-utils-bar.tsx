import { memo, useCallback, useRef, useState } from "react";
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
  PaperclipIcon,
} from "lucide-react";
import { ActionDropdown } from "./action-dropdown";
import { useMutation, useAction } from "convex/react";
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
import { useMessageActions } from "./index";
import { useUploadDocuments } from "@/hooks/chats/use-documents";

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

interface UserUtilsBarProps {
  input: MessageWithBranchInfo;
  isEditing?: boolean;
  setEditing?: Dispatch<SetStateAction<string | null>>;
  editedText?: string;
  editedDocuments?: Id<"documents">[];
  onDone?: () => void;
  onDocumentsChange?: (documents: Id<"documents">[]) => void;
}

export const UserUtilsBar = memo(
  ({
    input,
    isEditing,
    setEditing,
    editedText,
    editedDocuments,
    onDone,
    onDocumentsChange,
  }: UserUtilsBarProps) => {
    const { handleBranch, handleRegenerate, navigateBranch } = useMessageActions();
    const updateMessage = useMutation(api.chatMessages.mutations.updateInput);
    const chat = useAction(api.langchain.index.chat);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const handleFileUpload = useUploadDocuments({ type: "file" });

    // File upload handlers for editing
    const handleFileInputChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          const uploadedIds = await handleFileUpload(e.target.files);
          if (uploadedIds && onDocumentsChange) {
            onDocumentsChange([...(editedDocuments || []), ...uploadedIds]);
          }
        }
      },
      [handleFileUpload, editedDocuments, onDocumentsChange]
    );

    const handleDrop = useCallback(
      async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const uploadedIds = await handleFileUpload(e.dataTransfer.files);
          if (uploadedIds && onDocumentsChange) {
            onDocumentsChange([...(editedDocuments || []), ...uploadedIds]);
          }
        }
      },
      [handleFileUpload, editedDocuments, onDocumentsChange]
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!isDragActive) setIsDragActive(true);
      },
      [isDragActive]
    );

    const handleDragLeave = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragActive(false);
      },
      []
    );

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
        <div 
          className="flex flex-row items-center gap-1 self-start"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleFileInputChange}
          />
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
          <TooltipButton
            onClick={() => fileInputRef.current?.click()}
            icon={<PaperclipIcon className="h-4 w-4" />}
            tooltip="Attach files"
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
          onAction={() => handleBranch(input)}
          onActionWithModel={(model) => handleBranch(input, model)}
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
          onAction={() => handleRegenerate(input)}
          onActionWithModel={(model) => handleRegenerate(input, model)}
        />
        {copyText && <CopyButton text={copyText} />}
      </div>
    );
  },
);

UserUtilsBar.displayName = "UserUtilsBar";
