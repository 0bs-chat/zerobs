import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileTextIcon, ClockIcon, ChevronDownIcon } from "lucide-react";
import {
  Accordion,
  AccordionTrigger,
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Markdown } from "@/components/ui/markdown";
import { formatDate } from "@/lib/utils";
import { getDocTagInfo } from "@/lib/helper";
import { useSetAtom } from "jotai";
import { documentDialogOpenAtom } from "@/store/chatStore";
import type { Doc } from "../../../../../../convex/_generated/dataModel";

// Type definition for document search results
export type DocumentResultMetadata = {
  document: Doc<"documents">;
  source: string;
  type: string;
};

export type DocumentResult = {
  pageContent: string;
  metadata: DocumentResultMetadata;
};

interface DocumentResultDisplayProps {
  results: DocumentResult[];
  input?: Record<string, any>;
}

export const DocumentResultDisplay = ({
  results,
  input,
}: DocumentResultDisplayProps) => {
  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);

  const handleDocumentClick = (document: Doc<"documents">) => {
    setDocumentDialogOpen(document._id);
  };

  if (!results || results.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No document results found
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem
        value="document-search-results"
        className="px-0 border-none"
      >
        <AccordionTrigger className="flex items-center justify-start gap-2 text-sm text-muted-foreground py-0">
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              <span className="text-muted-foreground translate-y-[.1rem]">
                Document Search Results ({results.length})
              </span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 cursor-help">
                    {input?.queries ? (
                      input.queries.length === 1 ? (
                        input.queries[0]
                      ) : (
                        `${input.queries.length} queries`
                      )
                    ) : (
                      input?.query as string
                    )}
                    <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md">
                  <div className="space-y-2">
                    {input?.queries ? (
                      <>
                        <div className="font-medium text-sm">Document Search Queries:</div>
                        <ul className="space-y-1 text-xs">
                          {input.queries.map((query: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground min-w-[1rem]">
                                {index + 1}.
                              </span>
                              <span className="break-words">{query}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <div>
                        <div className="font-medium text-sm">Document Search Query:</div>
                        <div className="text-xs mt-1 break-words">{input?.query as string}</div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </AccordionTrigger>
        <AccordionContent className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[36rem] overflow-y-auto">
          {results.map((result, index) => {
            const { icon: Icon, className } = getDocTagInfo(
              result.metadata.document,
            );
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1 items-start w-full">
                    <div className="flex flex-row items-center gap-2 w-full">
                      <Icon className={`h-4 w-4 ${className}`} />
                      <button
                        onClick={() =>
                          handleDocumentClick(result.metadata.document)
                        }
                        className="font-medium text-sm leading-tight text-foreground truncate break-words whitespace-pre-wrap flex-1 text-left hover:underline"
                      >
                        {result.metadata.document.name || "Untitled Document"}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {formatDate(result.metadata.document._creationTime)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Markdown
                    content={`${result.pageContent.slice(0, 300)}...`}
                    id={result.metadata.document._id}
                    className="text-xs text-muted-foreground"
                  />
                </CardContent>
              </Card>
            );
          })}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
