import { memo } from "react";
import { ListTodoIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown/index";
import type { CompletedStep } from "../../../../convex/langchain/state";
// import { AIMessage } from "@langchain/core/messages";

// Define types for the new backend format
type BackendPastStep = {
  step: string;
  message: string;
};

type PlanningStepsProps = {
  pastSteps: CompletedStep[] | BackendPastStep[] | any[];
};

// Helper function to check if pastSteps are in the new backend format
function isBackendFormat(pastSteps: any[]): pastSteps is BackendPastStep[] {
  return (
    pastSteps.length > 0 &&
    typeof pastSteps[0] === "object" &&
    "step" in pastSteps[0] &&
    "message" in pastSteps[0] &&
    typeof pastSteps[0].step === "string" &&
    typeof pastSteps[0].message === "string"
  );
}

// Helper function to check if pastSteps are in the CompletedStep format
function isCompletedStepFormat(pastSteps: any[]): pastSteps is CompletedStep[] {
  return (
    pastSteps.length > 0 &&
    Array.isArray(pastSteps[0]) &&
    pastSteps[0].length === 2
  );
}

// Convert backend format to a renderable format
function convertBackendStepsToRenderable(backendSteps: BackendPastStep[]) {
  return backendSteps.map((stepData, idx) => {
    try {
      // Try to parse the message if it's JSON
      let messageContent = stepData.message;
      try {
        const parsedMessage = JSON.parse(stepData.message);
        if (parsedMessage.content) {
          messageContent =
            typeof parsedMessage.content === "string"
              ? parsedMessage.content
              : JSON.stringify(parsedMessage.content);
        }
      } catch {
        // If parsing fails, use the raw message
        messageContent = stepData.message;
      }

      return {
        stepNumber: idx + 1,
        stepTitle: stepData.step,
        content: messageContent,
        isParallel: false,
      };
    } catch (error) {
      console.warn("Failed to process backend step:", error);
      return {
        stepNumber: idx + 1,
        stepTitle: stepData.step,
        content: stepData.message,
        isParallel: false,
      };
    }
  });
}

// Convert CompletedStep format to a renderable format
function convertCompletedStepsToRenderable(completedSteps: CompletedStep[]) {
  return completedSteps.map((entry, idx) => {
    // Check if this is a parallel execution (nested array structure)
    if (Array.isArray(entry) && entry.length > 0) {
      // Check if the first element is also an array (indicating parallel steps)
      if (Array.isArray(entry[0]) && entry[0].length === 2) {
        // Parallel steps - treat entry as array of arrays
        const parallelSteps = entry as unknown as CompletedStep[][];
        const parallelContents = parallelSteps.map((stepTuple) => {
          const [plan, msg] = stepTuple;
          // Handle the message conversion more safely
          const content =
            typeof msg === "object" && "content" in msg
              ? typeof msg.content === "string"
                ? msg.content
                : String(msg.content)
              : String(msg);

          return {
            plan: typeof plan === "string" ? plan : String(plan),
            content,
          };
        });

        return {
          stepNumber: idx + 1,
          stepTitle: "Parallel execution",
          content: "",
          isParallel: true,
          parallelContents,
        };
      } else if (entry.length === 2) {
        // Single CompletedStep tuple [plan, message]
        const [plan, msg] = entry;
        const content =
          typeof msg === "object" && "content" in msg
            ? typeof msg.content === "string"
              ? msg.content
              : String(msg.content)
            : String(msg);

        return {
          stepNumber: idx + 1,
          stepTitle: typeof plan === "string" ? plan : String(plan),
          content,
          isParallel: false,
        };
      }
    }

    // Fallback for unexpected formats
    return {
      stepNumber: idx + 1,
      stepTitle: "Step",
      content: String(entry),
      isParallel: false,
    };
  });
}

export const PlanningSteps = memo(({ pastSteps }: PlanningStepsProps) => {
  if (!pastSteps || pastSteps.length === 0) {
    return null;
  }

  let renderableSteps: Array<{
    stepNumber: number;
    stepTitle: string;
    content: string;
    isParallel: boolean;
    parallelContents?: Array<{ plan: string; content: string }>;
  }> = [];

  // Convert different formats to a common renderable format
  if (isBackendFormat(pastSteps)) {
    renderableSteps = convertBackendStepsToRenderable(pastSteps);
  } else if (isCompletedStepFormat(pastSteps)) {
    renderableSteps = convertCompletedStepsToRenderable(pastSteps);
  } else {
    // Fallback for unknown formats
    console.warn("Unknown pastSteps format:", pastSteps);
    renderableSteps = pastSteps.map((step, idx) => ({
      stepNumber: idx + 1,
      stepTitle: "Step",
      content: String(step),
      isParallel: false,
    }));
  }

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="planning-steps" className="border-none">
        <AccordionTrigger className="text-sm justify-start items-center py-2 text-muted-foreground hover:text-foreground">
          <ListTodoIcon className="w-4 h-4" />
          View planning steps ({renderableSteps.length})
        </AccordionTrigger>
        <AccordionContent>
          <div className="bg-background/50 rounded-md p-3 border space-y-3">
            {renderableSteps.map((step) => (
              <div key={step.stepNumber} className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Step {step.stepNumber}
                  {step.isParallel && " (Parallel execution)"}:
                </div>

                {step.isParallel && step.parallelContents ? (
                  <div className="space-y-2">
                    {step.parallelContents.map((parallelContent, pIdx) => (
                      <div
                        key={pIdx}
                        className="space-y-1 pl-4 border-l-2 border-muted"
                      >
                        <div className="text-sm font-medium">
                          {parallelContent.plan}
                        </div>
                        <div className="text-sm">
                          <Markdown
                            content={parallelContent.content}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium">{step.stepTitle}</div>
                    <div className="text-sm">
                      <Markdown content={step.content} className="text-sm" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
});

PlanningSteps.displayName = "PlanningSteps";
