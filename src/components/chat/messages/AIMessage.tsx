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
  rightPanelActiveTabAtom,
  rightPanelVisibilityAtom,
  selectedArtifactAtom,
} from "@/store/chatStore";
import { PlanningSteps } from "./PlanningSteps";
import type { Artifact } from "@/components/chat/artifacts/utils";
import { ArtifactCard } from "@/components/chat/artifacts/card";

interface AIMessageProps {
  message: AIMessage;
  messageIndex?: number;
}

export const AIMessageComponent = React.memo(
  ({ message, messageIndex = -1 }: AIMessageProps) => {
    const setRightPanelVisible = useSetAtom(rightPanelVisibilityAtom);
    const setActiveTab = useSetAtom(rightPanelActiveTabAtom);
    const setSelectedArtifact = useSetAtom(selectedArtifactAtom);

    const handleViewArtifact = (artifact: Artifact) => {
      setSelectedArtifact(artifact);
      setActiveTab("artifacts");
      setRightPanelVisible(true);
    };

    const rawContent = React.useMemo(() => {
      return typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content
              .map((item: any) => (item.type === "text" ? item.text : ""))
              .join("")
          : String(message.content);
    }, [message.content]);

    const contentParts = React.useMemo(() => {
      const parts: (
        | { type: "text"; content: string }
        | { type: "artifact"; artifact: Artifact }
      )[] = [];

      const chunks = rawContent.split(/<artifact/);

      if (chunks[0]) {
        parts.push({ type: "text", content: chunks[0] });
      }

      for (let i = 1; i < chunks.length; i++) {
        const fullChunk = "<artifact" + chunks[i];

        const headerRegex =
          /<artifact\s+id="([^"]+)"\s+type="([^"]+)"(?:\s+language="([^"]+)")?\s+title="([^"]+)"[^>]*>/;
        const headerMatch = fullChunk.match(headerRegex);

        if (headerMatch) {
          const [, id, type, language, title] = headerMatch;
          const header = headerMatch[0];
          let artifactContent = fullChunk.substring(header.length);
          let trailingText = "";

          const endTag = "</artifact>";
          const endTagIndex = artifactContent.indexOf(endTag);

          if (endTagIndex !== -1) {
            trailingText = artifactContent.substring(
              endTagIndex + endTag.length,
            );
            artifactContent = artifactContent.substring(0, endTagIndex);
          }

          const artifact: Artifact = {
            id,
            type,
            language,
            title,
            content: artifactContent.trimStart(),
            messageIndex,
            createdAt: new Date(),
          };
          parts.push({ type: "artifact", artifact });

          if (trailingText) {
            parts.push({ type: "text", content: trailingText });
          }
        } else {
          // Not a valid artifact start, treat as text
          parts.push({ type: "text", content: fullChunk });
        }
      }

      return parts;
    }, [rawContent, messageIndex]);

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
        {contentParts.map((part, idx) => {
          if (part.type === "text") {
            return <Markdown key={idx} content={part.content} />;
          }
          if (part.type === "artifact") {
            return (
              <div key={idx} className="my-2">
                <ArtifactCard
                  artifact={part.artifact}
                  onView={handleViewArtifact}
                />
              </div>
            );
          }
          return null;
        })}
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
