import { memo, useMemo } from "react";
import { Markdown } from "@/components/ui/markdown";
import type { MessageWithBranchInfo } from "../../../hooks/chats/use-messages";

export type BranchDirection = "prev" | "next";

export interface MessageBranchNavigation {
  (depth: number, direction: BranchDirection): void;
}

interface UserMessageProps {
  item: MessageWithBranchInfo;
  navigateBranch: MessageBranchNavigation;
}

export const UserMessage = memo(({ item, navigateBranch }: UserMessageProps) => {
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

  // Memoize branch navigation buttons to prevent unnecessary re-renders
  const branchNavigation = useMemo(() => {
    if (item.totalBranches <= 1) return null;

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Branch: {item.branchIndex}/{item.totalBranches}
        </span>
        <button
          onClick={() => navigateBranch(item.depth, "prev")}
          className="px-2 py-1 rounded border hover:bg-accent transition-colors"
          aria-label="Previous branch"
        >
          ←
        </button>
        <button
          onClick={() => navigateBranch(item.depth, "next")}
          className="px-2 py-1 rounded border hover:bg-accent transition-colors"
          aria-label="Next branch"
        >
          →
        </button>
      </div>
    );
  }, [item.totalBranches, item.branchIndex, item.depth, navigateBranch]);

  return (
    <>
      <div className="bg-card max-w-[80%] self-end p-4 rounded-md shadow-sm">
        {renderedContent}
      </div>
      {branchNavigation}
    </>
  );
});

UserMessage.displayName = "UserMessage";
