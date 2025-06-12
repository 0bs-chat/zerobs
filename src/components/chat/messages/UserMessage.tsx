import React from "react";
import { HumanMessage } from "@langchain/core/messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontalIcon,
  TrashIcon,
  GitBranchIcon,
  CopyIcon,
  PencilIcon,
  CheckIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Markdown } from "@/components/ui/markdown/index";
import { useSetAtom } from "jotai";
import {
  documentDialogDocumentIdAtom,
  documentDialogOpenAtom,
} from "@/store/chatStore";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

interface UserMessageProps {
  message: HumanMessage;
}

export const UserMessageComponent = React.memo(({ message }: UserMessageProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
  const setDocumentDialogDocumentId = useSetAtom(documentDialogDocumentIdAtom);
  
  const text = Array.isArray(message.content)
    ? message.content
        .map((item) => (item.type === "text" ? item.text : null))
        .join("")
    : message.content;
    
  const fileIds = Array.isArray(message.content)
    ? message.content
        .map((item) =>
          item.type === "file" && "file" in item ? item.file.file_id : null
        )
        .filter(Boolean)
    : [];
    
  const documents = useQuery(api.documents.queries.getMultiple, {
    documentIds: fileIds as Id<"documents">[],
  });

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col group gap-1 max-w-[70%] w-fit items-end self-end">
      <div className="flex flex-col bg-card text-card-foreground rounded-xl border shadow-sm p-3 gap-2">
        <div className="text-md">
          <Markdown content={text} />
        </div>
        {documents?.map((document) => (
          <Badge
            className="text-xs font-bold p-4 w-full cursor-pointer shadow-sm"
            key={document._id}
            onClick={() => {
              setDocumentDialogOpen(true);
              setDocumentDialogDocumentId(document._id);
            }}
          >
            {document.name}
          </Badge>
        ))}
      </div>
      <div
        className={`flex flex-row items-center justify-start transition-opacity duration-100 gap-1 ${
          isDropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <Button variant="ghost" size="icon">
          <PencilIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive">
          <TrashIcon className="w-4 h-4" />
        </Button>
        <DropdownMenu onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontalIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <GitBranchIcon className="w-4 h-4 mr-2" />
              Branch from here
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCopyText}
              className={copied ? "text-green-600" : ""}
            >
              {copied ? (
                <CheckIcon className="w-4 h-4 mr-2" />
              ) : (
                <CopyIcon className="w-4 h-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy text"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

UserMessageComponent.displayName = "UserMessageComponent";