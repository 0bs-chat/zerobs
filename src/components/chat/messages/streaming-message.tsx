import { memo, useMemo } from "react";
import { AiMessageContent } from "./ai-message/ai-message-content";
import { ToolMessage } from "./ai-message/tool-message";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check } from "lucide-react";
import type { AIChunkGroup, ToolChunkGroup } from "../../../hooks/chats/use-stream";
import { AIMessage, ToolMessage as LangChainToolMessage } from "@langchain/core/messages";

interface StreamingMessageProps {
  chunkGroups: (AIChunkGroup | ToolChunkGroup)[];
  status?: string;
  completedSteps?: string[];
}

export const StreamingMessage = memo(({ chunkGroups, status, completedSteps }: StreamingMessageProps) => {
  const messageId = "streaming-message";

  // Create proper LangChain messages from chunk groups
  const langChainMessages = useMemo(() => {
    return chunkGroups.map((group, index) => {
      if (group.type === "ai") {
        return new AIMessage({
          content: group.content,
          additional_kwargs: group.reasoning ? { reasoning_content: group.reasoning } : {},
        });
      } else {
        return new LangChainToolMessage({
          content: "",
          name: group.toolName,
          tool_call_id: `streaming-tool-${index}`,
        });
      }
    });
  }, [chunkGroups]);

  // Show completed steps if in planning/deepsearch mode
  const planningSteps = useMemo(() => {
    if (!completedSteps || completedSteps.length === 0) return null;
    
    return (
      <div className="border rounded-lg p-4 bg-card my-2 flex flex-row">
        <div className="flex flex-col w-1/3 items-start gap-2">
          <div className="text-sm font-semibold">
            DeepSearch
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            {completedSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 bg-input rounded-full flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-foreground-muted" />
                </div>
                <div className="text-sm text-muted-foreground flex-1">
                  {step}
                </div>
              </div>
            ))}
            {status === "streaming" && (
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 bg-input rounded-full flex items-center justify-center mt-0.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                </div>
                <div className="text-sm text-muted-foreground flex-1">
                  Processing...
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="border-l" />
        <div className="flex flex-col gap-2 w-2/3 pl-4 max-h-[36rem] overflow-y-auto">
          {/* Current streaming content using existing components */}
          {langChainMessages.map((message, index) => (
            <div key={index} className="mb-4">
              {message.getType() === "ai" ? (
                <div>
                  <AiMessageContent
                    message={message}
                    messageId={`${messageId}-${index}`}
                    showReasoning={true}
                  />
                  {/* Show cursor when streaming */}
                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                </div>
              ) : (
                <div className="my-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {chunkGroups[index].type === "tool" && (chunkGroups[index] as ToolChunkGroup).isComplete ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span className="text-sm font-medium">{message.name}</span>
                    </div>
                  </div>
                  <ToolMessage message={message} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }, [completedSteps, status, langChainMessages, chunkGroups, messageId]);

  // Regular streaming display (no planning mode)
  const regularContent = useMemo(() => {
    return langChainMessages.map((message, index) => (
      <div key={index} className="mb-4">
        {message.getType() === "ai" ? (
          <div>
            <AiMessageContent
              message={message}
              messageId={`${messageId}-${index}`}
              showReasoning={true}
            />
            {/* Show cursor when streaming */}
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          </div>
        ) : (
          <div className="my-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                {chunkGroups[index].type === "tool" && (chunkGroups[index] as ToolChunkGroup).isComplete ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span className="text-sm font-medium">{message.name}</span>
              </div>
            </div>
            <ToolMessage message={message} />
          </div>
        )}
      </div>
    ));
  }, [langChainMessages, chunkGroups, messageId]);

  if (chunkGroups.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {planningSteps || regularContent}
    </div>
  );
});

StreamingMessage.displayName = "StreamingMessage"; 