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

const DocumentDisplayBadge = ({
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
    <Badge
      variant="default"
      className="group flex gap-1.5 py-1.5 cursor-pointer bg-muted-foreground/15 hover:bg-muted-foreground/25 hover:text-accent-foreground text-accent-foreground/70 transition duration-300 items-center justify-center px-2 flex-shrink-0"
      onClick={() => setDocumentDialogOpen(fileId as Id<"documents">)}
    >
      <div className="relative h-4 w-4">
        {documentData &&
          (() => {
            const selectedModel = models.find((m) => m.model_name === "gpt-4");
            const modalities = selectedModel?.modalities;
            const { icon: Icon, className: IconClassName } = getDocTagInfo(
              documentData,
              modalities
            );
            return (
              <Icon
                className={`${IconClassName} h-4 w-4 transition duration-300 opacity-80`}
              />
            );
          })()}
      </div>
      <span className="max-w-32 text-foreground/70 truncate text-xs cursor-pointer">
        {documentData?.name}
      </span>
    </Badge>
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
    <ScrollArea className="max-h-24 w-full px-1 pt-1">
      <div className="flex flex-wrap gap-1">
        {documents.map((doc) => {
          const { icon: Icon, className: IconClassName } = getDocTagInfo(
            doc,
            modalities
          );

          return (
            <Badge
              key={doc._id}
              variant="default"
              className="group flex gap-1.5 py-1.5 cursor-pointer bg-muted-foreground/15 hover:bg-muted-foreground/25 hover:text-accent-foreground text-accent-foreground/70 transition duration-300 items-center justify-center px-2 flex-shrink-0"
              onClick={() => handlePreview(doc._id)}
            >
              <div className="relative h-4 w-4">
                <Icon
                  className={`${IconClassName} h-4 w-4 group-hover:opacity-0 transition duration-300 opacity-80`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute inset-0 h-4 w-4 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 cursor-pointer transition duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(doc._id);
                  }}
                >
                  <XIcon className="w-3 h-3" />
                </Button>
              </div>
              <span className="max-w-32 text-foreground/70 truncate text-xs cursor-pointer">
                {doc.name}
              </span>
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
        const textContent = content.filter(
          (c) => (c as any).type === "text"
        ) as Array<{ type: "text"; text: string }>;
        const fileContent = content.filter(
          (c) => (c as any).type === "file"
        ) as Array<{ type: "file"; file: { file_id: string } }>;

        return (
          <>
            {textContent.map((entry, idx) => (
              <Markdown
                key={`text-${idx}`}
                content={entry.text}
                id={item.message._id}
                className="prose [&_p]:mt-0"
              />
            ))}
            {fileContent.length > 0 && (
              <ScrollArea className="max-h-24 w-full px-1 pt-1 whitespace-nowrap">
                <div className="flex gap-1">
                  {fileContent.map((entry) => (
                    <DocumentDisplayBadge
                      key={(entry as any).file.file_id}
                      fileId={(entry as any).file.file_id}
                      setDocumentDialogOpen={setDocumentDialogOpen}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        );
      }
      return (
        <Markdown
          content={content as string}
          id={item.message._id}
          className="prose [&_p]:mt-0"
        />
      );
    }, [content, item.message._id, setDocumentDialogOpen]);

    return (
      <div className="flex group/edit flex-col gap-1 max-w-[80%] self-end">
        {isEditing ? (
          <div className="flex w-screen bg-primary/15 dark:bg-primary/10 flex-col max-h-96 max-w-full self-end rounded-md px-4 py-3 shadow-sm border border-border/50">
            <AutosizeTextarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              minHeight={32}
              maxHeight={120}
              className="bg-transparent text-foreground/80 resize-none border-none w-full ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none focus-visible:outline-none text-base"
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
          <ScrollArea className="flex bg-primary/15 dark:bg-primary/10 flex-col max-h-96 max-w-full self-end rounded-md px-4 py-3 shadow-sm border border-border/50">
            {renderedContent}
          </ScrollArea>
        )}
        <div className="opacity-0 flex gap-2 group-hover/edit:opacity-100 transition-opacity">
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
