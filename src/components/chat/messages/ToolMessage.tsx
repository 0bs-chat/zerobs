import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface ToolStreamEvent {
  type: "tool_start" | "tool_end";
  toolName: string;
  input?: any;
  output?: any;
  id: string;
}

interface ToolMessageProps {
  message: Record<string, any>;
  streamEvents?: ToolStreamEvent[];
}

export const ToolMessage = React.memo(({
  message,
  streamEvents,
}: ToolMessageProps) => {
  const toolCall = message.content;
  const toolName = message.name || "Tool";
  
  const parsedContent = React.useMemo(() => {
    try {
      return typeof toolCall === "string" ? JSON.parse(toolCall) : toolCall;
    } catch {
      return toolCall;
    }
  }, [toolCall]);

  const toolStartEvent = streamEvents?.find(
    (event) => event.type === "tool_start" && event.toolName === toolName
  );
  
  const toolEndEvent = streamEvents?.find(
    (event) => event.type === "tool_end" && event.toolName === toolName
  );
  
  const isStreaming = toolStartEvent && !toolEndEvent;
  const isCompleted = toolEndEvent;
  const statusIndicator = isStreaming ? "⚡" : isCompleted ? "✅" : "🔧";
  const statusColor = isStreaming
    ? "bg-yellow-500"
    : isCompleted
    ? "bg-green-500"
    : "bg-blue-500";

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="tool-call" className="border rounded-lg">
        <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
          <div className="flex items-center gap-2 text-left">
            <div
              className={`w-2 h-2 ${statusColor} rounded-full ${
                isStreaming ? "animate-pulse" : ""
              }`}
            ></div>
            <span className="font-medium">
              {statusIndicator} {toolName}
            </span>
            {isStreaming && (
              <span className="text-xs text-muted-foreground">
                (running...)
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {(toolStartEvent?.input || parsedContent) && (
            <div className="mb-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Input:
              </div>
              <div className="bg-background/50 rounded-md p-3 border">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                  {typeof (toolStartEvent?.input || parsedContent) === "string"
                    ? toolStartEvent?.input || parsedContent
                    : JSON.stringify(
                        toolStartEvent?.input || parsedContent,
                        null,
                        2
                      )}
                </pre>
              </div>
            </div>
          )}
          {toolEndEvent?.output && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Output:
              </div>
              <div className="bg-background/50 rounded-md p-3 border">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                  {typeof toolEndEvent?.output === "string"
                    ? toolEndEvent?.output
                    : JSON.stringify(toolEndEvent?.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
          {isStreaming && (
            <div className="text-sm text-muted-foreground italic">
              Tool is running...
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
});

ToolMessage.displayName = "ToolMessage"; 