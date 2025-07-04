import { memo, useMemo } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SearchResultDisplay, type SearchResult } from "./search-results";
import { DocumentResultDisplay, type DocumentResult } from "./document-results";
import type { BaseMessage } from "@langchain/core/messages";

interface ToolMessageProps {
  message: BaseMessage;
}

export const ToolMessage = memo(({ message }: ToolMessageProps) => {
  // Memoize the parsed content to avoid unnecessary parsing
  const parsedContent = useMemo(() => {
    if (!message) return null;

    if (message.name === "searchWeb") {
      try {
        return { type: "searchWeb" as const, results: JSON.parse(message.content as string) as SearchResult[] };
      } catch (error) {
        return { type: "generic" as const, content: message.content };
      }
    }
    
    if (message.name === "searchProjectDocuments") {
      try {
        return { type: "document" as const, results: JSON.parse(message.content as string) as DocumentResult[] };
      } catch (error) {
        return { type: "generic" as const, content: message.content };
      }
    }

    return { type: "generic" as const, content: message.content };
  }, [message]);

  if (!message || !parsedContent) return null;

  if (parsedContent.type === "searchWeb") {
    return <SearchResultDisplay results={parsedContent.results} />;
  }

  if (parsedContent.type === "document") {
    return <DocumentResultDisplay results={parsedContent.results} />;
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
