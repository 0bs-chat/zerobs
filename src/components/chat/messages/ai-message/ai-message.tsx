import { memo, useMemo, useCallback } from "react";
import { Reasoning } from "./reasoning";
import { ToolMessage } from "./tool-message";
import { Markdown } from "@/components/ui/markdown";
import { parseContent, type ContentPart, type Artifact } from "../../artifacts/utils";
import { ArtifactCard } from "../../artifacts/card";
import { useSetAtom } from "jotai";
import { selectedArtifactAtom } from "@/store/chatStore";
import type { BaseMessage } from "@langchain/core/messages";

interface AiMessageContentProps {
  message: BaseMessage;
  messageId: string;
  className?: string;
}

export const AiMessageContent = memo(({ message, messageId, className }: AiMessageContentProps) => {
  const type = message?.getType?.();
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);

  const content = message?.content ?? "";
  const reasoning = message?.additional_kwargs?.reasoning_content as string | undefined;

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
              id={`${messageId}-${index}`} 
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
  }, [parsedContent, messageId, handleArtifactView]);

  // Memoize the message content based on type
  const messageContent = useMemo(() => {
    if (type === "ai") {
      return (
        <>
          <Reasoning reasoning={reasoning} messageId={messageId} />
          <div className={className}>
            {renderedContent}
          </div>
        </>
      );
    } else if (type === "tool") {
      return <ToolMessage message={message} />;
    } else {
      return (
        <>
          <div className="text-sm text-muted-foreground">Unknown:</div>
          <div>Can't parse message</div>
        </>
      );
    }
  }, [type, reasoning, messageId, renderedContent, message, className]);

  return <>{messageContent}</>;
});

AiMessageContent.displayName = "AiMessageContent"; 