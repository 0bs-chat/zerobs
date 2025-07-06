import { memo, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Markdown } from "@/components/ui/markdown";
import type { MessageWithBranchInfo } from "./utils-bar/branch-navigation";
import { Textarea } from "@/components/ui/textarea";

export const UserMessage = memo(({ 
  item, 
  isEditing,
  editedText,
  setEditedText
}: { 
  item: MessageWithBranchInfo, 
  isEditing: boolean,
  editedText: string;
  setEditedText: Dispatch<SetStateAction<string>>;
}) => {
  const content = item?.message?.message?.content;

  // Memoize the content rendering to avoid unnecessary calculations
  const renderedContent = useMemo(() => {
    if (Array.isArray(content)) {
      return content.map((entry, idx) => (
        <div key={`${item.message._id}-${idx}`}>
          {entry.type === "text" ? <Markdown content={entry.text} id={item.message._id} /> : entry}
          {entry.type === "file" ? entry.file.file_id : null}
        </div>
      ));
    }
    return content;
  }, [content, item.message._id]);

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
    <div className="bg-card max-w-full self-end p-4 rounded-md shadow-sm">
      {renderedContent}
    </div>
  );
});

UserMessage.displayName = "UserMessage";
