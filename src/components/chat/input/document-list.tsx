import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  documentDialogOpenAtom,
  newChatDocumentsAtom,
  newChatModelAtom,
} from "@/store/chatStore";
import { useRemoveDocument } from "@/hooks/use-documents";
import { getTagInfo } from "@/lib/helpers";
import { memo, useCallback } from "react";
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
        variant="secondary"
        className="flex items-center gap-1.5 pr-1"
        onClick={handlePreview}
      >
        <Icon className={`${IconClassName} h-3 w-3`} />
        <span className="max-w-32 truncate">{doc.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0.5 hover:bg-muted-foreground/20"
          onClick={handleRemove}
        >
          <XIcon className="w-3 h-3" />
        </Button>
      </Badge>
    );
  }
);
DocumentBadge.displayName = "DocumentBadge";

export const DocumentList = ({
  documentIds = [],
}: {
  documentIds?: Id<"documents">[];
}) => {
  const newChatDocuments = useAtomValue(newChatDocumentsAtom);
  const newChatModel = useAtomValue(newChatModelAtom);

  const documents = useQuery(
    api.documents.queries.getMultiple,
    documentIds.length > 0 || newChatDocuments.length > 0
      ? { documentIds: [...documentIds, ...newChatDocuments] }
      : "skip"
  );
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
        {documents.map((doc) => (
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
};
