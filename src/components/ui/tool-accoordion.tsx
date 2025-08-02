import { Check, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

type ToolAccordionProps = {
  messageName: string;
  input?: Record<string, any>;
  children: React.ReactNode;
  isComplete?: boolean;
};

function ToolAccordion({
  messageName,
  input,
  children,
  isComplete,
}: ToolAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="tool-call" className="px-0 border-none">
        <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
          {isComplete === true ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : isComplete === false ? (
            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
          ) : null}
          <span className="text-muted-foreground translate-y-[.1rem]">
            Tool Call ({messageName})
          </span>
        </AccordionTrigger>
        <AccordionContent className="bg-card rounded-md p-2 border mt-2 max-h-[36rem] overflow-y-auto">
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground">
            Input
          </h4>
          <pre className="text-xs bg-input/50 p-2 rounded overflow-x-auto mb-2 whitespace-pre-wrap">
            {JSON.stringify(input, null, 2)}
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
