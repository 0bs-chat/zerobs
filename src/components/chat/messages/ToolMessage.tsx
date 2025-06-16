import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ToolMessage } from "@langchain/core/messages";

interface ToolMessageProps {
  message: ToolMessage;
  isStreaming?: boolean;
}

export const ToolMessageComponent = React.memo(
  ({ message, isStreaming }: ToolMessageProps) => {
    const contentStr =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content, null, 2);

    // A streaming tool without content yet means it's still running.
    const hasOutput = contentStr.length > 0;

    const statusIndicator = isStreaming ? (hasOutput ? "✅" : "⚡") : "🔧";
    const statusColor = isStreaming
      ? hasOutput
        ? "bg-green-500"
        : "bg-yellow-500"
      : "bg-blue-500";

    return (
      <Accordion type="single" collapsible>
        <AccordionItem value="tool-call" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <div
                className={`w-2 h-2 ${statusColor} rounded-full ${
                  isStreaming && !hasOutput ? "animate-pulse" : ""
                }`}
              ></div>
              <span className="font-medium">
                {statusIndicator} {message.name || "Tool"}
              </span>
              {isStreaming && !hasOutput && (
                <span className="text-xs text-muted-foreground">
                  (running...)
                </span>
              )}
            </div>
          </AccordionTrigger>
          {contentStr && (
            <AccordionContent className="px-4 pb-4">
              <div className="bg-background/50 rounded-md p-3 border">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                  {contentStr}
                </pre>
              </div>
            </AccordionContent>
          )}
        </AccordionItem>
      </Accordion>
    );
  },
);

ToolMessageComponent.displayName = "ToolMessageComponent";
