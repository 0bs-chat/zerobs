import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FileIcon, LinkIcon, XIcon, YoutubeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChat } from "@/store/use-chat";

export const DocumentList = ({
  documentIds = [],
  onRemove,
}: {
  documentIds?: Id<"documents">[];
  onRemove?: (documentId: Id<"documents">) => void;
}) => {
  const documents = useQuery(api.documents.queries.getMultiple, {
    documentIds,
  });

  const { setDocumentDialogDocumentId, setDocumentDialogOpen } = useChat();

  if (!documents?.length) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileIcon className="w-3 h-3" />;
      case "url":
        return <LinkIcon className="w-3 h-3" />;
      case "youtube":
        return <YoutubeIcon className="w-3 h-3" />;
      default:
        return <FileIcon className="w-3 h-3" />;
    }
  };

  const handlePreview = (documentId: Id<"documents">) => {
    setDocumentDialogDocumentId(documentId);
    setDocumentDialogOpen(true);
  };

  return (
    <ScrollArea className="w-full max-h-24 px-1 pt-1">
      {documents.map((doc) => (
        <Badge
          key={doc._id}
          variant="secondary"
          className="flex items-center gap-1.5 pr-1"
          onClick={() => handlePreview(doc._id)}
        >
          {getIcon(doc.type)}
          <span className="max-w-32 truncate\">{doc.name}</span>
          {onRemove && (
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
          )}
        </Badge>
      ))}
    </ScrollArea>
  );
};
