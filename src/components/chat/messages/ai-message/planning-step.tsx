import { memo, useMemo } from "react";
import { AiMessageContent } from "./ai-message-content";
import { ChunkRenderer } from "../chunk-renderer";
import { mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import type { BaseMessage, StoredMessage } from "@langchain/core/messages";
import type { AIChunkGroup, ToolChunkGroup } from "@/hooks/chats/use-stream";
import { Separator } from "@/components/ui/separator";
import { Check } from "lucide-react";

interface PlanningStepProps {
  message?: BaseMessage;
  messageId: string;
}

export const PlanningStep = memo(({ 
  message,
  messageId,
}: PlanningStepProps) => {
  // Extract streaming chunk groups from message if available
  const streamingChunks = useMemo(() => {
    if (!message?.additional_kwargs?.chunkGroups) return null;
    return message.additional_kwargs.chunkGroups as (AIChunkGroup | ToolChunkGroup)[];
  }, [message]);

  // Memoize the completed steps rendering from pastSteps
  const pastSteps = useMemo(() => {
    if (!message || !Array.isArray(message.additional_kwargs.pastSteps)) {
      return null;
    }
    return message.additional_kwargs.pastSteps.map((pastStep, index) => {
      // Add safety check to ensure pastStep is an array with at least one element
      if (!Array.isArray(pastStep) || pastStep.length === 0) {
        console.warn('Invalid pastStep structure:', pastStep);
        return null;
      }
      
      const [step, _storedMessages] = pastStep;
      
      // Ensure step is a string
      if (typeof step !== 'string') {
        console.warn('Invalid step format:', step);
        return null;
      }
      
      return (
        <div key={`${messageId}-past-step-${index}`} className="flex items-start gap-2">
          <div className="flex-shrink-0 w-5 h-5 bg-input rounded-full flex items-center justify-center mt-0.5">
            <Check className="w-3 h-3 text-foreground-muted" />
          </div>
          <div className="text-sm text-muted-foreground flex-1">
            {step}
          </div>
        </div>
      );
    }).filter(Boolean); // Remove null entries
  }, [message, messageId]);
  
  const stepMessages = useMemo(() => {
    if (!message || !Array.isArray(message.additional_kwargs.pastSteps)) {
      return null;
    }
    return message.additional_kwargs.pastSteps.map((pastStep, index) => {
      // Add safety check to ensure pastStep is an array with at least two elements
      if (!Array.isArray(pastStep) || pastStep.length < 2) {
        console.warn('Invalid pastStep structure for stepMessages:', pastStep);
        return null;
      }
      
      const [_step, storedMessages] = pastStep;
      
      // Ensure storedMessages is an array
      if (!Array.isArray(storedMessages)) {
        console.warn('Invalid storedMessages format:', storedMessages);
        return null;
      }
      
      return storedMessages.map((storedMessage: StoredMessage, msgIndex: number) => {
        const convertedMessage = mapStoredMessagesToChatMessages([storedMessage])[0];
        return (
          <div key={`${messageId}-past-step-${index}-${msgIndex}`} className="mb-4">
            <AiMessageContent
              message={convertedMessage}
              messageId={`${messageId}-step-${index}-${msgIndex}`}
              showReasoning={true}
            />
          </div>
        );
      });
    }).filter(Boolean).flat(); // Remove null entries and flatten the nested arrays
  }, [message, messageId]);
  
  return (
    <div className="border rounded-lg p-4 bg-card my-2 flex flex-row">
      <div className="flex flex-col w-1/3 items-start gap-2">
        <div className="text-sm font-semibold">
          DeepSearch
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          {pastSteps}
        </div>
      </div>
      <div className="border-l" />
      <div className="flex flex-col gap-2 w-2/3 pl-4 max-h-[36rem] overflow-y-auto">
        {/* Show streaming chunks first if available */}
        {streamingChunks && streamingChunks.length > 0 && (
          <div className="mb-4 p-3 bg-background/50 rounded-md border-l-2 border-primary/30">
            <div className="text-xs font-medium text-muted-foreground mb-2">Current Step:</div>
            <ChunkRenderer
              chunkGroups={streamingChunks}
              showTypingIndicator={true}
              messageIdPrefix={`${messageId}-streaming`}
            />
          </div>
        )}
        {/* Then show completed step messages */}
        {stepMessages}
      </div>
    </div>
  );
});

PlanningStep.displayName = "PlanningStep";
