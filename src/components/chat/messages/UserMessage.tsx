import React from "react";
import { HumanMessage } from "@langchain/core/messages";
import { Badge } from "@/components/ui/badge";
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
  messageId?: string;
}

export const UserMessageComponent = React.memo(
  ({ message, messageId }: UserMessageProps) => {
    const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
    const setDocumentDialogDocumentId = useSetAtom(
      documentDialogDocumentIdAtom,
    );

    const text = Array.isArray(message.content)
      ? message.content
          .map((item) => (item.type === "text" ? item.text : null))
          .join("")
      : message.content;

    const fileIds = Array.isArray(message.content)
      ? message.content
          .map((item) =>
            item.type === "file" && "file" in item ? item.file.file_id : null,
          )
          .filter(Boolean)
      : [];

    const documents = useQuery(api.documents.queries.getMultiple, {
      documentIds: fileIds as Id<"documents">[],
    });

    return (
      <div className="flex flex-col gap-2 max-w-[70%] self-end bg-card text-card-foreground rounded-xl border shadow-sm p-3">
        <div className="text-md">
          <Markdown content={text} id={messageId} />
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
  },
);

UserMessageComponent.displayName = "UserMessageComponent";
