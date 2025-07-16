import { ScrollArea } from "@/components/ui/scroll-area";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentDialogOpenAtom, newChatModelAtom } from "@/store/chatStore";
import { useDocumentList, useRemoveDocument } from "@/hooks/use-documents";
import { getTagInfo } from "@/lib/helpers";
import React, { memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { models } from "../../../../convex/langchain/models";
import mime from "mime";

type DocumentBadgeProps = {
  doc: Doc<"documents">;
  onPreview: (documentId: Id<"documents">) => void;
  onRemove: () => void;
  modalities?: string[];
};

const DocumentBadge = memo(
  ({ doc, onPreview, onRemove, modalities }: DocumentBadgeProps) => {
    // Map file extensions to tags so loader logic recognizes supported modalities.
    let resolvedTag: string = doc.type;
    if (doc.type === "file") {
      const mimeType = mime.getType(doc.name) || "";

      if (mimeType === "application/pdf") {
        resolvedTag = "pdf";
      } else if (mimeType.startsWith("image/")) {
        resolvedTag = "image";
      } else if (mimeType.startsWith("video/")) {
        resolvedTag = "video";
      } else if (mimeType.startsWith("audio/")) {
        resolvedTag = "audio";
      } else if (mimeType.startsWith("text/")) {
        resolvedTag = "text";
      } else {
        // Fallback: derive from extension if mime type couldn't classify
        const extension =
          mime.getExtension(mimeType) ??
          doc.name.split(".").pop()?.toLowerCase();
        if (extension === "pdf") {
          resolvedTag = "pdf";
        }
      }
    }

    const { icon: Icon, className: IconClassName } = getTagInfo(
      resolvedTag,
      doc.status,
      modalities
    );

    const handlePreview = useCallback(() => {
      onPreview(doc._id);
    }, [onPreview, doc._id]);

    const handleRemove = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
      },
      [onRemove]
    );

    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1.5 px-1 py-1 bg-secondary/50 hover:bg-secondary/80 transition-colors duration-300"
        onClick={handlePreview}
      >
        <Icon className={`${IconClassName} h-4 w-4`} />
        <span className="max-w-32 truncate">{doc.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-2 hover:text-destructive cursor-pointer"
          onClick={handleRemove}
        >
          <XIcon className="w-4 h-4" />
        </Button>
      </Badge>
    );
  }
);
DocumentBadge.displayName = "DocumentBadge";

export const DocumentList = memo(() => {
  const { documents } = useDocumentList();

  const newChatModel = useAtomValue(newChatModelAtom);

  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
  const removeDocument = useRemoveDocument();

  const handlePreview = useCallback(
    (documentId: Id<"documents">) => {
      setDocumentDialogOpen(documentId);
    },
    [setDocumentDialogOpen]
  );

  const handleRemove = useCallback(
    (documentId: Id<"documents">) => {
      removeDocument(documentId);
    },
    [removeDocument]
  );

  if (!documents?.length) return null;

  const selectedModel = models.find((m) => m.model_name === newChatModel);
  const modalities = selectedModel?.modalities;

  return (
    <ScrollArea className="max-h-24 w-full px-1 pt-1 whitespace-nowrap">
      <div id="chatInputDocumentList" className="flex gap-1">
        {documents?.map((doc) => (
          <DocumentBadge
            key={doc._id}
            doc={doc}
            onPreview={handlePreview}
            onRemove={() => handleRemove(doc._id)}
            modalities={modalities}
          />
        ))}
      </div>
    </ScrollArea>
  );
});

DocumentList.displayName = "DocumentList";
