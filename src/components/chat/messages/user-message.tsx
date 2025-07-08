import { memo, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { motion } from "motion/react";
import { Markdown } from "@/components/ui/markdown";
import type { MessageWithBranchInfo } from "./utils-bar/branch-navigation";
import { Textarea } from "@/components/ui/textarea";
import { scaleIn, smoothTransition } from "@/lib/motion";

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

    // Memoize the content rendering to avoid unnecessary calculations
    const renderedContent = useMemo(() => {
      if (Array.isArray(content)) {
        return content.map((entry, idx) => (
          <div key={`${item.message._id}-${idx}`}>
            {entry.type === "text" ? (
              <Markdown content={entry.text} id={item.message._id} />
            ) : null}
            {entry.type === "file" ? entry.file.file_id : null}
          </div>
        ));
      }
      return content;
    }, [content]);

    if (isEditing) {
      return (
        <motion.div 
          variants={scaleIn}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={smoothTransition}
          className="bg-card max-w-full self-end p-4 rounded-md shadow-sm w-full"
        >
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="bg-background shadow-inner"
            autoFocus
          />
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="bg-card flex flex-col gap-1 max-w-full self-end p-4 rounded-md shadow-sm"
        whileHover={{ scale: 1.01 }}
        transition={smoothTransition}
      >
        {renderedContent}
      </motion.div>
    );
  },
);

UserMessage.displayName = "UserMessage";
