import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { useRemoveDocument } from "@/hooks/chats/use-documents";
import { getDocTagInfo } from "@/lib/helper";
import React, { useCallback } from "react";
import { useSetAtom } from "jotai";
import { models } from "../../../../convex/langchain/models";

type DocumentBadgeProps = {
  doc: Doc<"documents">;
  onPreview: (documentId: Id<"documents">) => void;
  onRemove: () => void;
  modalities?: string[];
};

const DocumentBadge = React.memo(
  ({ doc, onPreview, onRemove, modalities }: DocumentBadgeProps) => {
    const { icon: Icon, className: IconClassName } = getDocTagInfo(
      doc,
      modalities,
    );

    const handlePreview = useCallback(() => {
      onPreview(doc._id);
    }, [onPreview, doc._id]);

    const handleRemove = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
      },
      [onRemove],
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
  },
);
DocumentBadge.displayName = "DocumentBadge";

export const DocumentList = ({
  documentIds = [],
  model,
}: {
  documentIds?: Id<"documents">[];
  model: string;
}) => {
  const documents = useQuery(api.documents.queries.getMultiple, {
    documentIds,
  });
  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
  const removeDocument = useRemoveDocument();

  const handlePreview = useCallback(
    (documentId: Id<"documents">) => {
      setDocumentDialogOpen(documentId);
    },
    [setDocumentDialogOpen],
  );

  const handleRemove = useCallback(
    (documentId: Id<"documents">) => {
      removeDocument(documentId);
    },
    [removeDocument],
  );

  if (!documents?.length) return null;

  const selectedModel = models.find((m) => m.model_name === model);
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
