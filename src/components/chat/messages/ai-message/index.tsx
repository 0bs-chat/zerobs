import { memo, useMemo, useCallback } from "react";
import { Reasoning } from "./reasoning";
import { ToolMessage } from "./tool-message";
import { Markdown } from "@/components/ui/markdown";
import { parseContent, type ContentPart, type Artifact } from "../../artifacts/utils";
import { ArtifactCard } from "../../artifacts/card";
import { useSetAtom } from "jotai";
import { selectedArtifactAtom } from "@/store/chatStore";
import type { MessageBranchNavigation } from "../user-message";
import type { MessageWithBranchInfo } from "../../../../hooks/chats/use-messages";

interface AiMessageProps {
  item: MessageWithBranchInfo;
  navigateBranch: MessageBranchNavigation;
}

export const AiMessage = memo(({ item, navigateBranch }: AiMessageProps) => {
  const msg = item.message.message;
  const type = msg?.getType?.();
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);

  const content = msg?.content ?? "";
  const reasoning = msg?.additional_kwargs?.reasoning_content as string | undefined;

  // Memoize the artifact view handler to prevent unnecessary re-renders
  const handleArtifactView = useCallback((artifact: Artifact) => {
    setSelectedArtifact(artifact);
  }, [setSelectedArtifact]);

  // Memoize content parsing to avoid expensive re-calculations
  const parsedContent = useMemo(() => {
    if (type !== "ai") return [];
    return parseContent(content as string, 0);
  }, [content, type]);

  // Memoize the content rendering to avoid unnecessary re-renders
  const renderedContent = useMemo(() => {
    if (type !== "ai") return content as string;
    
    return parsedContent.map((part: ContentPart, index: number) => {
      if (part.type === "text") {
        // Only render non-empty text content
        if (part.content.trim()) {
          return (
            <Markdown 
              key={`text-${index}`} 
              content={part.content} 
              id={`${item.message._id}-${index}`} 
            />
          );
        }
        return null;
      } else if (part.type === "artifact") {
        return (
          <div key={`artifact-${index}`} className="my-4">
            <ArtifactCard 
              artifact={part.artifact} 
              onView={handleArtifactView}
            />
          </div>
        );
      }
      return null;
    });
  }, [parsedContent, item.message._id, handleArtifactView]);

  // Memoize the message content based on type
  const messageContent = useMemo(() => {
    if (type === "ai") {
      return (
        <>
          <Reasoning reasoning={reasoning} messageId={item.message._id} />
          <div className="">
            {renderedContent}
          </div>
        </>
      );
    } else if (type === "tool") {
      return <ToolMessage message={msg} />;
    } else {
      return (
        <>
          <div className="text-sm text-muted-foreground">Unknown:</div>
          <div>Can't parse message</div>
        </>
      );
    }
  }, [type, reasoning, item.message._id, renderedContent, msg]);

  // Memoize branch navigation buttons to prevent unnecessary re-renders
  const branchNavigation = useMemo(() => {
    if (item.totalBranches <= 1) return null;

    return (
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
    <div>
      {messageContent}
      {branchNavigation}
    </div>
  );
});

AiMessage.displayName = "AiMessage";
