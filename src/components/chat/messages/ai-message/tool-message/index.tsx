import { memo, useMemo } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { SearchResultDisplay, type SearchResult } from "./search-results";
import { DocumentResultDisplay, type DocumentResult } from "./document-results";
import type { BaseMessage } from "@langchain/core/messages";
import { FileDisplay } from "./file-result";

interface ToolMessageProps {
  message: BaseMessage;
}

export const ToolMessage = memo(({ message }: ToolMessageProps) => {
  // Memoize the parsed content to avoid unnecessary parsing
  const parsedContent = useMemo(() => {
    if (!message) return null;

    if (message.name === "searchWeb") {
      try {
        return {
          type: "searchWeb" as const,
          results: JSON.parse(message.content as string) as SearchResult[],
        };
      } catch (error) {
        return { type: "generic" as const, content: message.content };
      }
    }

    if (message.name === "searchProjectDocuments") {
      try {
        return {
          type: "document" as const,
          results: JSON.parse(message.content as string) as DocumentResult[],
        };
      } catch (error) {
        return { type: "generic" as const, content: message.content };
      }
    }

    try {
      const parsed = JSON.parse(message.content as string);
      if (Array.isArray(parsed)) {
        const hasFileAndText = parsed.some(
          (item) =>
            (item.type === "file" && item.file?.file_id) ||
            (item.type === "text" && item.text),
        );
        if (hasFileAndText) {
          return { type: "mixed" as const, content: parsed };
        }
      }
    } catch (error) {
      // Not valid JSON or not the expected format
    }

    return { type: "generic" as const, content: message.content };
  }, [message]);

  const input = message.additional_kwargs?.input as Record<string, any>;

  if (!message || !parsedContent) return null;

  if (parsedContent.type === "searchWeb") {
    if (Array.isArray(parsedContent.results)) {
      return <SearchResultDisplay results={parsedContent.results} />;
    }
  }

  if (parsedContent.type === "document") {
    if (Array.isArray(parsedContent.results)) {
      return <DocumentResultDisplay results={parsedContent.results} />;
    }
  }

  if (parsedContent.type === "mixed") {
    return (
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="tool-call" className="px-0 border-none">
          <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
            <span className="text-muted-foreground translate-y-[.1rem]">
              Tool Call ({message.name})
            </span>
          </AccordionTrigger>
          <AccordionContent className="bg-card rounded-md p-2 border mt-2 max-h-[36rem] overflow-y-auto">
            {input && (
              <>
                <h4 className="text-xs font-semibold mb-1">Input</h4>
                <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto mb-2 whitespace-pre-wrap">
                  {JSON.stringify(input, null, 2)}
                </pre>
                <h4 className="text-xs font-semibold mb-1">Output</h4>
              </>
            )}
            <div className="flex flex-col gap-4">
              {parsedContent.content.map((item, index) => {
                if (item.type === "file" && item.file?.file_id) {
                  return <FileDisplay key={index} fileId={item.file.file_id} />;
                }
                if (item.type === "text" && item.text) {
                  return (
                    <pre
                      key={index}
                      className="text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap"
                    >
                      {item.text}
                    </pre>
                  );
                }
                return null;
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="tool-call" className="px-0 border-none">
        <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
          <span className="text-muted-foreground translate-y-[.1rem]">
            Tool Call ({message.name})
          </span>
        </AccordionTrigger>
        <AccordionContent className="bg-card rounded-md p-2 border mt-2 max-h-[36rem] overflow-y-auto">
          {input && (
            <>
              <h4 className="text-xs font-semibold mb-1">Input</h4>
              <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto mb-2 whitespace-pre-wrap">
                {JSON.stringify(input, null, 2)}
              </pre>
              <h4 className="text-xs font-semibold mb-1">Output</h4>
            </>
          )}
          <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(parsedContent.content, null, 2)}
          </pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
});

ToolMessage.displayName = "ToolMessage";
