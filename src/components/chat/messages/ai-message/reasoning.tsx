import { memo } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown";

interface ReasoningProps {
  reasoning?: string;
  messageId: string;
}

export const Reasoning = memo(({ reasoning, messageId }: ReasoningProps) => {
  if (!reasoning) return null;

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="reasoning" className="px-0 border-none">
        <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
          <span className="text-muted-foreground translate-y-[.1rem]">Reasoning</span>
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
});

Reasoning.displayName = "Reasoning";
