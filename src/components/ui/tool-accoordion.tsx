import { Check, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cleanToolName, getToolStatusText } from "@/lib/tool-utils";

type ToolAccordionProps = {
  messageName: string;
  children: React.ReactNode;
  isComplete?: boolean;
};

function ToolAccordion({
  messageName,
  children,
  isComplete,
}: ToolAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem
        value="tool-call"
        className={`relative px-0 border dark:border-border/60 rounded-md overflow-hidden bg-muted dark:bg-card supports-[backdrop-filter]:backdrop-blur-sm`}
      >
        <AccordionTrigger
          className={`py-2 px-2 sm:px-3 gap-2 text-xs font-medium items-center justify-start cursor-pointer no-underline hover:no-underline transition-colors ${
            isComplete === true
              ? "bg-green-500/5 hover:bg-green-500/10"
              : isComplete === false
                ? "bg-amber-500/5 hover:bg-amber-500/10"
                : "bg-muted/20 hover:bg-muted/30"
          } supports-[backdrop-filter]:backdrop-blur-sm`}
          showIcon={false}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isComplete !== undefined && (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-sm ${
                  isComplete ? "bg-green-500/10" : "bg-amber-500/10"
                }`}
              >
                {isComplete ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                )}
              </span>
            )}
            <Badge
              variant="outline"
              className="text-foreground/80 bg-primary/10"
            >
              TOOL
            </Badge>
            <span className="text-foreground/80 truncate">
              {cleanToolName(messageName, isComplete)}
            </span>
            {isComplete !== undefined && (
              <span className="ml-2 text-foreground/80">
                {getToolStatusText(isComplete)}
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="rounded-md bg-muted dark:bg-card text-foreground/70 p-2 max-h-[36rem]  overflow-y-auto">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default ToolAccordion;
