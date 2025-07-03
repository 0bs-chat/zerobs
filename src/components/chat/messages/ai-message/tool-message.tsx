import { memo, useMemo } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SearchResultDisplay } from "./search-result";
import type { SearchResult } from "./search-result";

interface ToolMessageProps {
  message: any;
}

export const ToolMessage = memo(({ message }: ToolMessageProps) => {
  // Memoize the parsed content to avoid unnecessary parsing
  const parsedContent = useMemo(() => {
    if (!message) return null;

    if (message.name === "searchWeb") {
      let results: SearchResult[] = [];
      try {
        results = JSON.parse(message.content as string) as SearchResult[];
      } catch (err) {
        console.error("Failed to parse search results", err);
      }
      return { type: "searchWeb", results };
    }

    return { type: "generic", content: message.content };
  }, [message]);

  if (!message || !parsedContent) return null;

  if (parsedContent.type === "searchWeb") {
    return <SearchResultDisplay results={parsedContent.results || []} />;
  }

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="tool-call" className="px-0 border-none">
        <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
          <span className="text-muted-foreground translate-y-[.1rem]">Tool Call ({message.name})</span>
        </AccordionTrigger>
        <AccordionContent className="bg-card rounded-md p-2 border mt-2 max-h-[36rem] overflow-y-auto">
          <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
            {JSON.stringify(parsedContent.content, null, 2)}
          </pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
});

ToolMessage.displayName = "ToolMessage";
