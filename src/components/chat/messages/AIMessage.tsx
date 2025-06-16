import React from "react";
import { AIMessage } from "@langchain/core/messages";
import { BrainIcon, ListTodoIcon } from "lucide-react";
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

interface AIMessageProps {
  message: AIMessage;
  messageId?: string;
}

export const AIMessageComponent = React.memo(
  ({ message, messageId }: AIMessageProps) => {
    const content = React.useMemo(() => {
      return typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content
              .map((item: any) => (item.type === "text" ? item.text : ""))
              .join("")
          : String(message.content);
    }, [message.content]);

    const reasoning = message.additional_kwargs?.reasoning_content as
      | string
      | undefined;

    const pastSteps = message.additional_kwargs?.pastSteps as
      | (CompletedStep | CompletedStep[])[]
      | undefined;

    return (
      <div className="flex flex-col w-full">
        {reasoning && (
          <Accordion type="single" collapsible>
            <AccordionItem value="reasoning" className="border-none">
              <AccordionTrigger className="text-sm justify-start items-center py-2 text-muted-foreground hover:text-foreground">
                <BrainIcon className="w-4 h-4" />
                View reasoning
              </AccordionTrigger>

              <AccordionContent>
                <div className="bg-background/50 rounded-md p-3 border">
                  <Markdown
                    content={reasoning}
                    className="text-sm text-muted-foreground"
                    id={messageId ? `${messageId}-reasoning` : undefined}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        {pastSteps && pastSteps.length > 0 && (
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
                                  <Markdown
                                    content={content}
                                    className="text-sm"
                                    id={
                                      messageId
                                        ? `${messageId}-step-${idx}-${pIdx}`
                                        : undefined
                                    }
                                  />
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
                            <Markdown
                              content={content}
                              className="text-sm"
                              id={
                                messageId
                                  ? `${messageId}-step-${idx}`
                                  : undefined
                              }
                            />
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        <Markdown content={content} id={messageId} />
      </div>
    );
  },
);

AIMessageComponent.displayName = "AIMessageComponent";
