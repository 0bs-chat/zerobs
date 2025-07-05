import { memo, useMemo } from "react";
import { AiMessageContent } from "./ai-message/ai-message";
import { ToolMessage } from "./ai-message/tool-message";
import type { AIChunkGroup, ToolChunkGroup } from "../../../hooks/chats/use-stream";
import { PlanningStep } from "./ai-message/planning-step";
import { AIMessage, ToolMessage as LangChainToolMessage, mapChatMessagesToStoredMessages } from "@langchain/core/messages";

export const StreamingMessage = memo(({ chunks, status, completedSteps }: {
  chunks: (AIChunkGroup | ToolChunkGroup)[];
  status?: string;
  completedSteps?: string[];
}) => {
  const messageId = "streaming-message";

  const langchainMessages = useMemo(() => {
    return chunks
      .map((chunk) => {
        if (chunk?.type === "ai") {
          return new AIMessage({
            content: chunk.content,
            additional_kwargs: chunk.reasoning
              ? { reasoning_content: chunk.reasoning }
              : {},
          });
        }
        if (chunk?.type === "tool") {
          if (chunk.isComplete) {
            return new LangChainToolMessage({
              content: chunk.output as string,
              name: chunk.toolName,
              tool_call_id: `streaming-tool-${chunk.toolName}`,
            });
          } else {
            return new AIMessage({
              content: "",
              tool_calls: [{
                id: `streaming-tool-${chunk.toolName}`,
                type: "tool_call",
                name: chunk.toolName,
                args: JSON.parse(JSON.stringify(chunk.input)),
              }],
            });
          }
        }
        return null;
      })
      .filter((m): m is AIMessage | LangChainToolMessage => !!m);
  }, [chunks]);

  const planningSteps = useMemo(() => {
    if (!completedSteps || completedSteps.length === 0) return null;
    const message = new AIMessage({
      content: "",
      additional_kwargs: { pastSteps: [[completedSteps[0], mapChatMessagesToStoredMessages(langchainMessages)], ...completedSteps.slice(1).map((step) => [step, []])] },
    });
    return <PlanningStep message={message} isStreaming={status === "streaming"} messageId={messageId} />;
  }, [completedSteps, langchainMessages, messageId, status]);

  // Regular streaming display (no planning mode)
  const regularContent = useMemo(() => {
    console.log(status);
    return langchainMessages.map((message, index) => (
      <div key={index} className="mb-4">
        {message?.getType() === "ai" ? (
          <AiMessageContent
            message={message}
            messageId={`${messageId}-${index}`}
          />
        ) : (
          <ToolMessage
            message={message!}
          />
        )}
        {["streaming", "pending"].includes(status ?? "") && <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-4 bg-current animate-pulse" />
        </div>}
      </div>
    ));
  }, [langchainMessages, messageId, status]);

  if (chunks.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {planningSteps || regularContent}
    </div>
  );
});

StreamingMessage.displayName = "StreamingMessage"; 