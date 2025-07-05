import { memo, useMemo } from "react";
import { AiMessageContent } from "./ai-message";
import { mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2 } from "lucide-react";

interface PlanningStepProps {
  message?: BaseMessage;
  messageId: string;
  isStreaming?: boolean;
}

export const PlanningStep = memo(({ 
  message,
  messageId,
  isStreaming,
}: PlanningStepProps) => {
  const pastSteps = useMemo(() => {
    if (!message || !Array.isArray(message.additional_kwargs.pastSteps)) {
      return null;
    }
    const steps = message.additional_kwargs.pastSteps?.map((pastStep) => {
      if (!Array.isArray(pastStep) || pastStep.length === 0) {
        return null;
      }
      
      const [step, _storedMessages] = pastStep;
      return step;
    });
    return steps?.map((step, index) => {
      return (
        <div key={`${messageId}-past-step-${index}`} className="flex items-start gap-2">
          <div className="flex-shrink-0 w-5 h-5 bg-input rounded-full flex items-center justify-center mt-0.5">
            {isStreaming && index === steps.length - 1 ?
              <Loader2 className="w-3 h-3 animate-spin" /> :
              <Check className="w-3 h-3 text-foreground-muted" />
            }
          </div>
          <div className="text-sm text-muted-foreground flex-1 min-w-0 break-all whitespace-pre-wrap">
            {step}
          </div>
        </div>
      );
    }).filter(Boolean); // Remove null entries
  }, [message, messageId, isStreaming]);
  
  const stepMessages = useMemo(() => {
    if (!message || !Array.isArray(message.additional_kwargs.pastSteps)) {
      return null;
    }
    const messages = message.additional_kwargs.pastSteps.map((pastStep) => {
      if (!Array.isArray(pastStep)) {
        return null;
      }
      const [_step, storedMessages] = pastStep;
      if (!Array.isArray(storedMessages)) {
        return null;
      }
      return mapStoredMessagesToChatMessages(storedMessages);
    }).flat().filter((m): m is BaseMessage => !!m);

    return messages.map((pastStep, index) => {
      return (
        <AiMessageContent
          key={`${messageId}-step-${index}`}
          message={pastStep}
          messageId={`${messageId}-step-${index}`}
        />
      );
    });
  }, [message, messageId]);

  return (
    <div className="border rounded-lg p-4 bg-card my-2 flex flex-row">
      <div className="flex flex-col w-1/3 items-start gap-2">
        <div className="text-sm font-semibold">
          DeepSearch
        </div>
        <Separator />
        <div className="flex flex-col gap-2 pr-4">
          {pastSteps}
        </div>
      </div>
      <div className="border-l" />
      <div className="flex flex-col gap-2 w-2/3 pl-4 max-h-[36rem] overflow-y-auto">
        {/* Show completed step messages */}
        {stepMessages}
      </div>
    </div>
  );
});

PlanningStep.displayName = "PlanningStep";
