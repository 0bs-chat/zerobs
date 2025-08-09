import { Check, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { formatToolInput, getToolStatusText } from "@/lib/tool-utils";

type ToolAccordionProps = {
  messageName: string;
  input?: Record<string, any>;
  children: React.ReactNode;
  isComplete?: boolean;
};

const getContentClassName = (isComplete?: boolean) => {
  const baseClasses =
    "rounded-md p-2 border mt-2 max-h-[38rem] overflow-y-auto";

  if (isComplete === false) {
    return `${baseClasses} bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800`;
  }
  if (isComplete === true) {
    return `${baseClasses} bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800`;
  }
  return `${baseClasses} bg-card`;
};

function ToolAccordion({
  messageName,
  input,
  children,
  isComplete,
}: ToolAccordionProps) {
  return (
    <Accordion
      type="multiple"
      className="w-full bg-accent/20 px-2 py-1.5 rounded-lg cursor-pointer"
      defaultValue={isComplete === false ? ["tool-call"] : []}
    >
      <AccordionItem value="tool-call" className="px-0 border-none">
        <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
          {isComplete === true ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : isComplete === false ? (
            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
          ) : null}
          <span className="text-muted-foreground ">
            {messageName}{" "}
            {getToolStatusText(isComplete) &&
              `(${getToolStatusText(isComplete)})`}
          </span>
        </AccordionTrigger>
        <AccordionContent className={getContentClassName(isComplete)}>
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground">
            Input
          </h4>
          <pre className="text-xs bg-input/50 p-2 rounded overflow-x-auto mb-2 whitespace-pre-wrap">
            {formatToolInput(input)}
          </pre>
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground">
            Output
          </h4>
          <div className="bg-input/50 rounded overflow-x-auto whitespace-pre-wrap">
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default ToolAccordion;
