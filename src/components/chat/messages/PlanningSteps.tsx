import React from "react";
import { ListTodoIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown/index";
import type { CompletedStep } from "../../../../convex/langchain/state";
import {
  coerceMessageLikeToMessage,
  mapStoredMessageToChatMessage,
} from "@langchain/core/messages";

interface PlanningStepsProps {
  pastSteps: (CompletedStep | CompletedStep[])[];
}

export const PlanningSteps = React.memo(({ pastSteps }: PlanningStepsProps) => {
  if (!pastSteps || pastSteps.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="planning-steps" className="border-none">
        <AccordionTrigger className="text-sm justify-start items-center py-2 text-muted-foreground hover:text-foreground">
          <ListTodoIcon className="w-4 h-4" />
          View planning steps ({pastSteps.length})
        </AccordionTrigger>
        <AccordionContent>
          <div className="bg-background/50 rounded-md p-3 border space-y-3">
            {pastSteps.map((entry, idx) => {
              if (
                Array.isArray(entry) &&
                entry.length > 0 &&
                Array.isArray(entry[0])
              ) {
                // Parallel steps (array of CompletedStep)
                const parallelSteps = entry as CompletedStep[];
                return (
                  <div key={idx} className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Step {idx + 1} (Parallel execution):
                    </div>
                    {parallelSteps.map((stepTuple, pIdx) => {
                      const [plan, msg] = stepTuple;
                      const messageContent = coerceMessageLikeToMessage(
                        mapStoredMessageToChatMessage(msg),
                      );
                      const content =
                        typeof messageContent.content === "string"
                          ? messageContent.content
                          : String(messageContent.content);

                      return (
                        <div
                          key={pIdx}
                          className="ml-4 p-2 border-l-2 border-muted space-y-1"
                        >
                          <div className="text-sm font-medium">
                            {idx + 1}.{pIdx + 1}: {plan.step}
                          </div>
                          {plan.additional_context && (
                            <div className="text-xs text-muted-foreground">
                              Context: {plan.additional_context}
                            </div>
                          )}
                          <div className="text-sm">
                            <Markdown content={content} className="text-sm" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              } else {
                // Single CompletedStep
                const [plan, msg] = entry as CompletedStep;
                const messageContent = coerceMessageLikeToMessage(
                  mapStoredMessageToChatMessage(msg),
                );
                const content =
                  typeof messageContent.content === "string"
                    ? messageContent.content
                    : String(messageContent.content);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="text-sm font-medium">
                      Step {idx + 1}: {plan.step}
                    </div>
                    {plan.additional_context && (
                      <div className="text-xs text-muted-foreground">
                        Context: {plan.additional_context}
                      </div>
                    )}
                    <div className="text-sm">
                      <Markdown content={content} className="text-sm" />
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
});

PlanningSteps.displayName = "PlanningSteps";
