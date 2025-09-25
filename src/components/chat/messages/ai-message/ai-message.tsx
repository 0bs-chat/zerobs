import { memo, useMemo } from "react";
import { Reasoning } from "./reasoning";
import { ToolMessage } from "./tool-message";
import { Markdown } from "@/components/ui/markdown";
import { parseContent, type ContentPart } from "../../../artifacts/utils";
import { ArtifactCard } from "../../../artifacts/card";
import type { BaseMessage } from "@langchain/core/messages";

interface AiMessageContentProps {
  message: BaseMessage;
  messageId: string;
  className?: string;
  isStreaming?: boolean;
}

export const AiMessageContent = memo(
  ({ message, messageId, className, isStreaming }: AiMessageContentProps) => {
    const type = message?.getType?.();

    const content = message?.content ?? "";
    const reasoning = message?.additional_kwargs?.reasoning_content as
      | string
      | undefined;

    // Memoize content parsing to avoid expensive re-calculations
    const parsedContent = useMemo(() => {
      if (type !== "ai") {
        return [];
      }
      if (Array.isArray(content)) {
        return [];
      }
      // Ensure content is a string before parsing
      const contentString =
        typeof content === "string" ? content : String(content);
      const parsed = parseContent(contentString);
      return parsed;
    }, [content, type]);

    // Memoize the content rendering to avoid unnecessary re-renders
    const renderedContent = useMemo(() => {
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
              <ArtifactCard artifact={part.artifact} />
            </div>
          );
        }
        return null;
      });
    }, [parsedContent, messageId]);

    const messageContent = useMemo(() => {
      if (type === "ai") {
        return (
          <>
            <Reasoning
              reasoning={reasoning}
              messageId={messageId}
              isStreaming={renderedContent.length > 0 ? false : isStreaming}
            />
            <div className={className}>{renderedContent}</div>
          </>
        );
      } else if (type === "tool") {
        return <ToolMessage message={message} />;
      } else {
        return (
          <>
            <div className="text-sm text-muted-foreground/70">Unknown:</div>
            <div>Can't parse message</div>
          </>
        );
      }
    }, [type, reasoning, messageId, renderedContent, message, className]);

    return <>{messageContent}</>;
  },
);

AiMessageContent.displayName = "AiMessageContent";
