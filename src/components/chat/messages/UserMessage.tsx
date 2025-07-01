import React, { useState } from "react";
import { HumanMessage } from "@langchain/core/messages";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown/index";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import {
  documentDialogDocumentIdAtom,
  documentDialogOpenAtom,
} from "@/store/chatStore";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { CheckIcon, XIcon } from "lucide-react";
import { useMutation } from "convex/react";

interface UserMessageProps {
  message: HumanMessage;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  onSaveEdit?: (content: string, regenerate?: boolean) => void;
  messageIndex?: number;
  chatId?: Id<"chats">;
}

export const UserMessageComponent = React.memo(
  ({
    message,
    isEditing = false,
    onCancelEdit,
    onSaveEdit,
    messageIndex,
    chatId,
  }: UserMessageProps) => {
    const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
    const setDocumentDialogDocumentId = useSetAtom(
      documentDialogDocumentIdAtom
    );

    // update chat message and then regenerate the message
    const updateMessage = useMutation(api.chatMessages.mutations.update);
    const regenerateMessage = useAction(api.chatMessages.mutations.regenerate);

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

    const [editContent, setEditContent] = useState(text);

    const handleSave = async (regenerate: boolean = false) => {
      if (messageIndex === undefined) return;

      // Close edit state immediately
      onSaveEdit?.(editContent, regenerate);

      try {
        await updateMessage({
          id: message.id as Id<"chatMessages">,
          updates: {
            message: editContent,
          },
        });
        await regenerateMessage({
          id: message.id as Id<"chatMessages">,
          chatId: chatId as Id<"chats">,
        });
      } catch (error) {
        console.error("Failed to edit message:", error);
      }
    };

    const handleCancel = () => {
      setEditContent(text);
      onCancelEdit?.();
    };

    if (isEditing) {
      return (
        <div className="flex flex-col gap-2 max-w-[70%] self-end bg-card text-card-foreground rounded-xl border shadow-sm p-3">
          <AutosizeTextarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="resize-none bg-card border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            minHeight={40}
            maxHeight={300}
            placeholder="Edit your message..."
          />

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

          <div className="flex flex-row gap-2 justify-end mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8"
            >
              <XIcon className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              className="h-8"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Submit
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleSave(true)}
              className="h-8"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Submit & Generate
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 max-w-[70%] self-end bg-card text-card-foreground rounded-xl border shadow-sm p-3">
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
    );
  }
);

UserMessageComponent.displayName = "UserMessageComponent";
