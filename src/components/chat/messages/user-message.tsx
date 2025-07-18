import { memo, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Markdown } from "@/components/ui/markdown";
import type { MessageWithBranchInfo } from "./utils-bar/branch-navigation";
import { Button } from "@/components/ui/button";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  AutosizeTextarea,
  type AutosizeTextAreaRef,
} from "@/components/ui/autosize-textarea";
import { useDebouncedCallback } from "use-debounce";

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
    const userMessageRef = useRef<AutosizeTextAreaRef>(null);

    const debouncedSetEditedText = useDebouncedCallback(
      (value: string) => setEditedText(value),
      300
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
                className="prose [&_p]:mb-0 [&_p]:mt-0 [&_p]:text-sm"
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

    if (isEditing) {
      return (
        <div className="bg-card max-w-full self-end p-4 rounded-md shadow-sm w-full">
          <AutosizeTextarea
            defaultValue={editedText}
            maxHeight={100}
            ref={userMessageRef}
            onChange={(e) => debouncedSetEditedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const currentValue = userMessageRef.current?.textArea.value;
                if (currentValue?.trim() === "" || currentValue === undefined) {
                  toast.error("Can't send empty message");
                  return;
                }
                setEditedText(currentValue);
              }
            }}
            className=" shadow-inner w-96 ring-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-card"
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
  }
);

UserMessage.displayName = "UserMessage";
