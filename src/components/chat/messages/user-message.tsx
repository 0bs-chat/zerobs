import { memo, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Markdown } from "@/components/ui/markdown";
import type { MessageWithBranchInfo } from "./utils-bar/branch-navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";

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

export const UserMessage = memo(
  ({
    item,
    isEditing,
    editedText,
    setEditedText,
  }: {
    item: MessageWithBranchInfo;
    isEditing: boolean;
    editedText: string;
    setEditedText: Dispatch<SetStateAction<string>>;
  }) => {
    const content = item?.message?.message?.content;
    const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);

    // Memoize the content rendering to avoid unnecessary calculations
    const renderedContent = useMemo(() => {
      if (Array.isArray(content)) {
        return content.map((entry) => (
          <>
            {entry.type === "text" ? (
              <Markdown content={entry.text} id={item.message._id} className="prose [&_p]:mb-0" />
            ) : null}
            {entry.type === "file" ? (
              <DocumentButton
                fileId={entry.file.file_id}
                setDocumentDialogOpen={setDocumentDialogOpen}
              />
            ) : null}
          </>
        ));
      }
      return content;
    }, [content, item.message._id, setDocumentDialogOpen]);

    if (isEditing) {
      return (
        <div className="bg-card max-w-full self-end p-4 rounded-md shadow-sm w-full">
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="bg-background shadow-inner"
            autoFocus
          />
        </div>
      );
    }

    return (
      <div className="bg-card flex flex-col gap-1 max-w-full self-end p-4 rounded-md shadow-sm">
        {renderedContent}
      </div>
    );
  },
);

UserMessage.displayName = "UserMessage";
