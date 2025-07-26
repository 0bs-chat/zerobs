import { memo, useMemo, useCallback, useRef, useState, useEffect } from "react";

import { Markdown } from "@/components/ui/markdown";
import type { MessageWithBranchInfo, MessageGroup } from "../../../../convex/chatMessages/helpers";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useUploadDocuments } from "@/hooks/chats/use-documents";
import { PaperclipIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDocTagInfo } from "@/lib/helper";
import { models } from "../../../../convex/langchain/models";
import { UserUtilsBar } from "./utils-bar/user-utils-bar";

const DocumentButton = ({
  fileId,
  setDocumentDialogOpen,
}: {
  fileId: string;
  setDocumentDialogOpen: (id: Id<"documents"> | undefined) => void;
}) => {
  const documentData = useQuery(api.documents.queries.get, {
    documentId: fileId as Id<"documents">,
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
  const documents = useQuery(api.documents.queries.getMultiple, {
    documentIds,
  });
  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);

  const handlePreview = useCallback(
    (documentId: Id<"documents">) => {
      setDocumentDialogOpen(documentId);
    },
    [setDocumentDialogOpen],
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
            modalities,
          );

          return (
            <Badge
              key={doc._id}
              variant="secondary"
              className="flex items-center gap-1.5 pr-1 cursor-pointer"
              onClick={() => handlePreview(doc._id)}
            >
              <Icon className={`${IconClassName} h-3 w-3`} />
              <span className="max-w-32 truncate">{doc.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0.5 hover:bg-muted-foreground/20"
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
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editedText, setEditedText] = useState("");
    const [editedDocuments, setEditedDocuments] = useState<Id<"documents">[]>([]);

    const isEditing = editingMessageId === item.message._id;

    useEffect(() => {
      if (editingMessageId) {
        const messageToEdit = groupedMessages?.find(
          (g) => g.input.message._id === editingMessageId,
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const handleFileUpload = useUploadDocuments({ type: "file" });

    // File upload handlers for editing
    const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const uploadedIds = await handleFileUpload(e.target.files);
        if (uploadedIds) {
          setEditedDocuments(prev => [...prev, ...uploadedIds]);
        }
      }
    }, [handleFileUpload]);

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const uploadedIds = await handleFileUpload(e.dataTransfer.files);
        if (uploadedIds) {
          setEditedDocuments(prev => [...prev, ...uploadedIds]);
        }
      }
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!isDragActive) setIsDragActive(true);
    }, [isDragActive]);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragActive(false);
    }, []);

    const handleRemoveDocument = useCallback((documentId: Id<"documents">) => {
      setEditedDocuments(prev => prev.filter(id => id !== documentId));
    }, []);

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
      <div className="group flex flex-col gap-1 max-w-[80%] self-end">
        {isEditing ? (
          <div
            className={`bg-card max-w-full self-end p-4 rounded-md shadow-sm w-full ${
              isDragActive ? 'border-2 border-dashed border-primary' : ''
            }`}
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
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="bg-background shadow-inner mb-2"
              autoFocus
              placeholder="Edit your message..."
            />

            {/* File management section */}
            <div className="flex flex-col gap-2">
              {editedDocuments && editedDocuments.length > 0 && (
                <EditingDocumentList
                  documentIds={editedDocuments}
                  onRemove={handleRemoveDocument}
                />
              )}

              <div className="flex items-center justify-between">
                {isDragActive && (
                  <span className="text-sm text-muted-foreground">
                    Drop files here to add them
                  </span>
                )}
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8"
                >
                  <PaperclipIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card flex flex-col gap-1 max-w-full self-end p-4 rounded-md shadow-sm">
            {renderedContent}
          </div>
        )}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <UserUtilsBar
            input={item}
            isEditing={isEditing}
            setEditing={setEditingMessageId}
            editedText={editedText}
            editedDocuments={editedDocuments}
            onDone={onDone}
          />
        </div>
      </div>
    );
  },
);

UserMessage.displayName = "UserMessage";
