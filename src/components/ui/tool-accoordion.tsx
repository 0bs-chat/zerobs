import { Check, HammerIcon, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cleanToolName, getToolStatusText } from "@/lib/tool-utils";

type ToolAccordionProps = {
  messageName: string;
  input?: Record<string, any>;
  children: React.ReactNode;
  isComplete?: boolean;
};

function ToolAccordion({
  messageName,
  children,
  isComplete,
}: ToolAccordionProps) {
  const cleanedName = cleanToolName(messageName, isComplete);
  const statusText = getToolStatusText(isComplete);

  return (
    <Accordion
      type="multiple"
      className="w-full border border-border/50 rounded-md bg-card"
      defaultValue={isComplete === false ? ["tool-call"] : []}
    >
      <AccordionItem value="tool-call" className="border-none">
        <AccordionTrigger
          showIcon={false}
          className="px-3 py-2 text-sm items-center justify-start hover:bg-muted transition-colors rounded-md gap-2"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <HammerIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground truncate">{cleanedName}</span>
            {statusText && (
              <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded font-mono shrink-0">
                {statusText}
              </span>
            )}
          </div>
          <div className="flex items-center">
            {isComplete === true ? (
              <Check className="w-4 h-4 text-primary" />
            ) : isComplete === false ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3 py-3 bg-muted/50 border-t border-border max-h-[32rem] overflow-y-auto">
          <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default ToolAccordion;
