import { memo } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown";
import { Loader2 } from "lucide-react";

interface ReasoningProps {
  reasoning?: string;
  messageId: string;
  isStreaming?: boolean;
}

export const Reasoning = memo(
  ({ reasoning, messageId, isStreaming }: ReasoningProps) => {
    if (!reasoning) return null;

    return (
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="reasoning" className="px-0 border-none">
          <AccordionTrigger className="py-1 gap-2 text-sm cursor-pointer font-semibold items-center justify-start">
            <span className="text-muted-foreground ">Reasoning</span>
            {isStreaming && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground translate-y-[.1rem]" />
            )}
          </AccordionTrigger>
          <AccordionContent className="bg-card rounded-md p-2 border mt-2 max-h-[36rem] overflow-y-auto">
            <Markdown
              content={reasoning}
              id={messageId}
              className="prose-p:text-sm prose-p:text-muted-foreground"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }
);

Reasoning.displayName = "Reasoning";
