import React from "react";
import { AIMessage } from "@langchain/core/messages";
import { BrainIcon, FileIcon, ExternalLinkIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown/index";
import { Favicon } from "@/components/ui/favicon";
import type { CompletedStep } from "../../../../convex/langchain/state";
import { Document } from "@langchain/core/documents";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSetAtom } from "jotai";
import {
  documentDialogDocumentIdAtom,
  documentDialogOpenAtom,
} from "@/store/chatStore";
import { PlanningSteps } from "./PlanningSteps";

interface AIMessageProps {
  message: AIMessage;
}

export const AIMessageComponent = React.memo(
  ({ message }: AIMessageProps) => {
    const content = React.useMemo(() => {
      return typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content
              .map((item: any) => (item.type === "text" ? item.text : ""))
              .join("")
          : String(message.content);
    }, [message.content]);

    const reasoning = message.additional_kwargs?.reasoning_content as
      | string
      | undefined;

    const pastSteps = message.additional_kwargs?.pastSteps as
      | (CompletedStep | CompletedStep[])[]
      | undefined;

    const documents = message.additional_kwargs?.documents as
      | Document[]
      | undefined;

    // Helper function to extract URL from Tavily content
    const extractUrlFromTavilyContent = (content: string): string | null => {
      const urlMatch = content.match(/https?:\/\/[^\s\n]+/);
      return urlMatch ? urlMatch[0] : null;
    };

    const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
    const setDocumentDialogDocumentId = useSetAtom(
      documentDialogDocumentIdAtom,
    );

    return (
      <div className="flex flex-col w-full">
        {reasoning && (
          <Accordion type="single" collapsible>
            <AccordionItem value="reasoning" className="border-none">
              <AccordionTrigger className="text-sm justify-start items-center py-2 text-muted-foreground hover:text-foreground">
                <BrainIcon className="w-4 h-4" />
                View reasoning
              </AccordionTrigger>

              <AccordionContent>
                <div className="bg-background/50 rounded-md p-3 border">
                  <Markdown
                    content={reasoning}
                    className="text-sm text-muted-foreground"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        {pastSteps && <PlanningSteps pastSteps={pastSteps} />}
        <Markdown content={content} />
        {documents && documents.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="documents" className="border-none">
              <AccordionTrigger className="text-sm justify-start items-center py-2 text-muted-foreground hover:text-foreground">
                <FileIcon className="w-4 h-4" />
                View sources ({documents.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="bg-background/50 rounded-md p-3 border space-y-3">
                  {documents.map((doc, idx) => {
                    const isTavilyDoc = doc.metadata.source === "tavily";
                    
                    if (isTavilyDoc) {
                      const url = extractUrlFromTavilyContent(doc.pageContent);
                      
                      return (
                        <div key={idx} className="space-y-2 p-3 border rounded-md bg-background">
                          <div className="flex items-center gap-2">
                            {url ? (
                              <Favicon 
                                url={url} 
                                className="w-4 h-4 flex-shrink-0" 
                                fallbackIcon={ExternalLinkIcon}
                              />
                            ) : (
                              <ExternalLinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                            {url && (
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline truncate"
                              >
                                {url}
                              </a>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-3">
                            {doc.pageContent.split('\n').slice(2).join('\n').trim()}
                          </div>
                        </div>
                      );
                    } else {
                      const docId = doc.metadata.source as Id<"documents">;
                      const document = useQuery(api.documents.queries.get, {
                        documentId: docId,
                      });
                      console.log("document", doc.pageContent);
                      return (
                        <div key={idx} className="space-y-2 p-3 border rounded-md bg-background" onClick={() => {
                          setDocumentDialogDocumentId(docId);
                          setDocumentDialogOpen(true);
                        }}>
                          <div className="flex items-center gap-2">
                            <FileIcon className="w-4 h-4 text-gray-500" />
                            <div className="font-medium text-sm cursor-pointer" >
                              {document?.name}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <Markdown
                              content={doc.pageContent.length > 500 
                                ? doc.pageContent.substring(0, 500) + "..." 
                                : doc.pageContent}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    );
  },
);

AIMessageComponent.displayName = "AIMessageComponent";
