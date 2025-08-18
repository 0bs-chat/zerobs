import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../convex/_generated/api";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";
import { XIcon } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/error-state";
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
        variant="default"
        className="group flex gap-1.5 py-1 cursor-pointer bg-accent/65 hover:bg-accent/100 hover:text-accent-foreground text-accent-foreground/90 rounded-md transition duration-300 items-center justify-center"
        onClick={handlePreview}
      >
        <div className="relative h-4 w-4">
          <Icon
            className={`${IconClassName} h-4 w-4 group-hover:opacity-0 transition duration-300`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute inset-0 h-4 w-4 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 cursor-pointer transition duration-300"
            onClick={handleRemove}
          >
            <XIcon className="w-3 h-3" />
          </Button>
        </div>
        <span className="max-w-32 truncate text-xs cursor-pointer">
          {doc.name}
        </span>
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
  const {
    data: documents,
    isLoading: isLoadingDocuments,
    isError: isDocumentsError,
    error: documentsError,
  } = useQuery({
    ...convexQuery(api.documents.queries.getMultiple, { documentIds }),
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

  if (!documents?.length) return null;

  if (isLoadingDocuments) {
    return (
      <div className="flex items-center justify-start p-2">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <LoadingSpinner sizeClassName="h-4 w-4" />
          Loading attached documents...
        </div>
      </div>
    );
  }

  if (isDocumentsError || documentsError) {
    return (
      <div className="flex items-center justify-start p-2">
        <ErrorState
          title="Error loading documents"
          showDescription={false}
          className="p-2"
          density="compact"
        />
      </div>
    );
  }

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
