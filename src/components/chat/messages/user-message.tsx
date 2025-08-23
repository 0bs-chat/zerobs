import { memo, useMemo, useCallback, useState, useEffect } from "react";

import { Markdown } from "@/components/ui/markdown";
import type {
  MessageWithBranchInfo,
  MessageGroup,
} from "../../../../convex/chatMessages/helpers";
import { Button } from "@/components/ui/button";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import type { Id } from "../../../../convex/_generated/dataModel";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDocTagInfo } from "@/lib/helper";
import { models } from "../../../../convex/langchain/models";
import { UserUtilsBar } from "./utils-bar/user-utils-bar";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";

const DocumentButton = ({
  fileId,
  setDocumentDialogOpen,
}: {
  fileId: string;
  setDocumentDialogOpen: (id: Id<"documents"> | undefined) => void;
}) => {
  const { data: documentData } = useQuery({
    ...convexQuery(api.documents.queries.get, {
      documentId: fileId as Id<"documents">,
    }),
  });

  return (
    <Button
      className="py-7 cursor-pointer"
      onClick={() => setDocumentDialogOpen(fileId as Id<"documents">)}
    >
      {documentData?.name}
    </Button>
  );
};

// Custom DocumentList for editing with remove functionality
const EditingDocumentList = ({
  documentIds,
  onRemove,
}: {
  documentIds: Id<"documents">[];
  onRemove: (documentId: Id<"documents">) => void;
}) => {
  const { data: documents } = useQuery({
    ...convexQuery(api.documents.queries.getMultiple, { documentIds }),
  });
  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);

  const handlePreview = useCallback(
    (documentId: Id<"documents">) => {
      setDocumentDialogOpen(documentId);
    },
    [setDocumentDialogOpen]
  );

  if (!documents?.length) return null;

  const selectedModel = models.find((m) => m.model_name === "gpt-4");
  const modalities = selectedModel?.modalities;

  return (
    <ScrollArea className="max-h-24 w-full px-1 pt-1 whitespace-nowrap">
      <div className="flex gap-1">
        {documents.map((doc) => {
          const { icon: Icon, className: IconClassName } = getDocTagInfo(
            doc,
            modalities
          );

          return (
            <Badge
              key={doc._id}
              variant="outline"
              className="flex items-center gap-1.5 py-1 pr-1 cursor-pointer rounded-lg bg-secondary/30 hover:bg-secondary/50 border-secondary text-secondary-foreground hover:text-secondary-foreground transition-all duration-200 shadow-xs hover:shadow-sm"
              onClick={() => handlePreview(doc._id)}
            >
              <Icon className={`${IconClassName} h-3.5 w-3.5 opacity-70`} />
              <span className="max-w-32 truncate text-sm font-medium text-secondary-foreground/90">
                {doc.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0.5 text-secondary-foreground/60 hover:text-destructive hover:bg-destructive/15 transition-colors cursor-pointer rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(doc._id);
                }}
              >
                <XIcon className="w-3 h-3" />
              </Button>
            </Badge>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export const UserMessage = memo(
  ({
    item,
    groupedMessages,
  }: {
    item: MessageWithBranchInfo;
    groupedMessages?: MessageGroup[];
  }) => {
    // State management moved from UserMessageGroup
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
      null
    );
    const [editedText, setEditedText] = useState("");
    const [editedDocuments, setEditedDocuments] = useState<Id<"documents">[]>(
      []
    );

    const isEditing = editingMessageId === item.message._id;

    useEffect(() => {
      if (editingMessageId) {
        const messageToEdit = groupedMessages?.find(
          (g) => g.input.message._id === editingMessageId
        );
        if (messageToEdit) {
          const content = messageToEdit.input.message.message.content;
          const textContent = Array.isArray(content)
            ? ((
                content.find((c) => c.type === "text") as
                  | { type: "text"; text: string }
                  | undefined
              )?.text ?? "")
            : "";
          const documentIds = Array.isArray(content)
            ? content
                .filter((c) => c.type === "file")
                .map((c) => (c as any).file.file_id as Id<"documents">)
            : [];
          setEditedText(textContent);
          setEditedDocuments(documentIds);
        }
      }
    }, [editingMessageId, groupedMessages]);

    const onDone = () => {
      setEditingMessageId(null);
      setEditedText("");
      setEditedDocuments([]);
    };
    const content = item?.message?.message?.content;
    const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);

    const handleRemoveDocument = useCallback((documentId: Id<"documents">) => {
      setEditedDocuments((prev) => prev.filter((id) => id !== documentId));
    }, []);

    const handleDocumentsChange = useCallback(
      (documents: Id<"documents">[]) => {
        setEditedDocuments(documents);
      },
      []
    );

    // Memoize the content rendering to avoid unnecessary calculations
    const renderedContent = useMemo(() => {
      if (Array.isArray(content)) {
        return content.map((entry, idx) => (
          <div key={entry.type === "file" ? entry.file.file_id : `text-${idx}`}>
            {entry.type === "text" ? (
              <Markdown
                content={entry.text}
                id={item.message._id}
                className="prose [&_p]:mt-0"
              />
            ) : null}
            {entry.type === "file" ? (
              <DocumentButton
                fileId={entry.file.file_id}
                setDocumentDialogOpen={setDocumentDialogOpen}
              />
            ) : null}
          </div>
        ));
      }
      return content;
    }, [content, item.message._id, setDocumentDialogOpen]);

    return (
      <div className="group flex flex-col gap-1 w-full">
        <div
          className={`${isEditing ? "w-[80%]" : "max-w-[80%]"} self-end transition-all duration-300`}
        >
          {isEditing ? (
            <div className="bg-card w-full rounded-md shadow-sm p-2 border-2 border-transparent">
              <AutosizeTextarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                minHeight={32}
                maxHeight={120}
                className="bg-transparent resize-none border-none w-full ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground/80 outline-none focus-visible:outline-none text-base"
                autoFocus
                placeholder="Edit your message..."
              />

              {/* File management section */}
              <div className="flex flex-col gap-2 ">
                {editedDocuments && editedDocuments.length > 0 && (
                  <EditingDocumentList
                    documentIds={editedDocuments}
                    onRemove={handleRemoveDocument}
                  />
                )}
              </div>
            </div>
          ) : (
            <ScrollArea className="bg-card flex flex-col max-h-96 max-w-full px-4 py-3 rounded-md shadow-sm">
              {renderedContent}
            </ScrollArea>
          )}
        </div>
        <div className="opacity-0 flex gap-2 group-hover:opacity-100 transition-opacity self-end">
          <UserUtilsBar
            input={item}
            isEditing={isEditing}
            setEditing={setEditingMessageId}
            editedText={editedText}
            editedDocuments={editedDocuments}
            onDone={onDone}
            onDocumentsChange={handleDocumentsChange}
          />
        </div>
      </div>
    );
  }
);

UserMessage.displayName = "UserMessage";
