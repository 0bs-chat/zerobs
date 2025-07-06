import { memo, useMemo } from "react";
import { Reasoning } from "./reasoning";
import { ToolMessage } from "./tool-message";
import { Markdown } from "@/components/ui/markdown";
import {
  parseContent,
  type ContentPart,
} from "../../../artifacts/utils";
import { ArtifactCard } from "../../../artifacts/card";
import { useSetAtom } from "jotai";
import { parsedArtifactsContentAtom } from "@/store/chatStore";
import type { BaseMessage } from "@langchain/core/messages";

interface AiMessageContentProps {
  message: BaseMessage;
  messageId: string;
  className?: string;
}

export const AiMessageContent = memo(
  ({ message, messageId, className }: AiMessageContentProps) => {
    const type = message?.getType?.();
    const setParsedArtifactsContent = useSetAtom(parsedArtifactsContentAtom);

    const content = message?.content ?? "";
    const reasoning = message?.additional_kwargs?.reasoning_content as
      | string
      | undefined;

    // Memoize content parsing to avoid expensive re-calculations
    const parsedContent = useMemo(() => {
      if (type !== "ai") {
        return [];
      }
      const parsed = parseContent(content as string, 0);
      setParsedArtifactsContent(parsed);
      return parsed;
    }, [content, type, setParsedArtifactsContent]);

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
            <Reasoning reasoning={reasoning} messageId={messageId} />
            <div className={className}>{renderedContent}</div>
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
  },
);

AiMessageContent.displayName = "AiMessageContent";
