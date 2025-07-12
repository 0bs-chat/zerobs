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

type ToolAccordionProps = {
  messageName: string;
  input?: Record<string, any>;
  children: React.ReactNode;
};
function ToolAccordion({ messageName, input, children }: ToolAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="tool-call" className="px-0 border-none">
        <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
          <span className="text-muted-foreground translate-y-[.1rem]">
            Tool Call ({messageName})
          </span>
        </AccordionTrigger>
        <AccordionContent className="bg-card rounded-md p-2 border mt-2 max-h-[36rem] overflow-y-auto">
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Input</h4>
          <pre className="text-xs bg-input/50 p-2 rounded overflow-x-auto mb-2 whitespace-pre-wrap">
            {JSON.stringify(input, null, 2)}
          </pre>
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Output</h4>
          <div className="bg-input/50 rounded overflow-x-auto whitespace-pre-wrap">
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export const ToolMessage = memo(({ message }: { message: BaseMessage }) => {
  const parsedContent = useMemo(() => {
    if (!message) return null;

    // 1) Known “searchWeb” → SearchResult[]
    if (message.name === "searchWeb") {
      try {
        return {
          type: "searchWeb" as const,
          results: JSON.parse(message.content as string) as SearchResult[],
        };
      } catch {
        return { type: "generic" as const, content: message.content };
      }
    }

    // 2) Known “searchProjectDocuments” → DocumentResult[]
    if (message.name === "searchProjectDocuments") {
      try {
        return {
          type: "document" as const,
          results: JSON.parse(message.content as string) as DocumentResult[],
        };
      } catch {
        return { type: "generic" as const, content: message.content };
      }
    }

    // 3) Mixed [ { type: "file", file: { file_id } } | { type: "text", text } ]
    try {
      const maybeArr = JSON.parse(message.content as string);
      if (Array.isArray(maybeArr)) {
        const isMixed = maybeArr.some(
          (i) =>
            (i.type === "file" && i.file?.file_id) ||
            (i.type === "text" && i.text),
        );
        if (isMixed) {
          return { type: "mixed" as const, content: maybeArr };
        }
      }
    } catch {
      // not JSON or not the format we expected
    }

    // 4) fallback generic
    return { type: "generic" as const, content: message.content };
  }, [message]);

  const input = (message.additional_kwargs as any)?.input as
    | Record<string, any>
    | undefined;

  if (!parsedContent) return null;

  // Search/Web calls render in their own specialized component
  if (parsedContent.type === "searchWeb") {
    return <SearchResultDisplay results={parsedContent.results} input={input} />;
  }
  if (parsedContent.type === "document") {
    return <DocumentResultDisplay results={parsedContent.results} />;
  }

  // MIXED: files + text blocks
  if (parsedContent.type === "mixed") {
    return (
      <ToolAccordion messageName={message.name ?? "unknown"} input={input}>
        <div className="flex flex-col gap-4">
          {parsedContent.content.map((item, idx) => {
            if (item.type === "file" && item.file?.file_id) {
              return <FileDisplay key={idx} fileId={item.file.file_id} />;
            }
            if (item.type === "text" && item.text) {
              return (
                <pre
                  key={idx}
                  className="text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap"
                >
                  {item.text}
                </pre>
              );
            }
            return null;
          })}
        </div>
      </ToolAccordion>
    );
  }

  // GENERIC: just dump the string or JSON
  return (
    <ToolAccordion messageName={message.name ?? "unknown"} input={input}>
      {typeof parsedContent.content === "string" ? (
        <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
          {parsedContent.content}
        </pre>
      ) : (
        <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(parsedContent.content, null, 2)}
        </pre>
      )}
    </ToolAccordion>
  );
});
ToolMessage.displayName = "ToolMessage";