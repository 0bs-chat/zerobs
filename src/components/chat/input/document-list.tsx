import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chatStore";
import { useRemoveDocument } from "@/hooks/use-documents";
import { getTagInfo } from "@/lib/react-utils";

export const DocumentList = ({
  documentIds = [],
}: {
  documentIds?: Id<"documents">[];
}) => {
  const documents = useQuery(api.documents.queries.getMultiple, {
    documentIds,
  });
  const removeDocument = useRemoveDocument();

  const { setDocumentDialogDocumentId, setDocumentDialogOpen } = useChatStore();

  if (!documents?.length) return null;

  const handlePreview = (documentId: Id<"documents">) => {
    setDocumentDialogDocumentId(documentId);
    setDocumentDialogOpen(true);
  };

  return (
    <ScrollArea className="max-h-24 w-full px-1 pt-1 whitespace-nowrap">
      <div id="chatInputDocumentList" className="flex gap-1">
        {documents.map((doc) => {
          const { icon: Icon, className: IconClassName } = getTagInfo(doc.type, doc.status);
          return (
          <Badge
            key={doc._id}
            variant="secondary"
            className="flex items-center gap-1.5 pr-1"
            onClick={() => handlePreview(doc._id)}
          >
            <Icon className={`${IconClassName} h-3 w-3`} />
            <span className="max-w-32 truncate\">{doc.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0.5 hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.stopPropagation();
                removeDocument(doc._id);
              }}
            >
              <XIcon className="w-3 h-3" />
            </Button>
          </Badge>
        )})}
      </div>
    </ScrollArea>
  );
};
