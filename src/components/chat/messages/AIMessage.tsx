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
import { parseContent } from "@/components/chat/artifacts/utils";
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

    const contentParts = React.useMemo(
      () => parseContent(rawContent, messageIndex),
      [rawContent, messageIndex],
    );

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
      </div>
    );
  },
);

AIMessageComponent.displayName = "AIMessageComponent";
