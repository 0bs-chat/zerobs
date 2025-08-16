import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Favicon } from "@/components/ui/favicon";
import { Markdown } from "@/components/ui/markdown";
import { extractDomain, formatDate } from "@/lib/utils";
import { ExternalLinkIcon, GlobeIcon, ClockIcon } from "lucide-react";

// Type definition for search results output
export type SearchResultMetadata = {
  type: string; // e.g., "search"
  title: string; // Page title
  source: string; // URL of the source
  publishedDate: string; // ISO date string
  author: string; // Author name (can be empty)
  image?: string; // Optional image URL
  favicon?: string; // Optional favicon URL
};

export type SearchResult = {
  pageContent: string; // Full text content of the page
  metadata: SearchResultMetadata; // Metadata about the source
};

interface SearchResultDisplayProps {
  input: Record<string, any> | undefined;
  results: SearchResult[];
}

export const SearchResultDisplay = ({
  results,
  input,
}: SearchResultDisplayProps) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No search results found
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      className="w-full border p-1.5 border-border/50 bg-card rounded-lg"
      // defaultValue={["web-search-results"]} // Remove this line to keep it closed by default
    >
      <AccordionItem value="web-search-results" className="px-0 border-none">
        <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <GlobeIcon className="w-4 h-4" />
              <span className="text-muted-foreground">
                Web Search ({results.length})
              </span>
            </div>
            {input?.query ? (
              <div className="text-[11px] text-muted-foreground truncate max-w-[50%]">
                {String(input.query)}
              </div>
            ) : null}
          </div>
        </AccordionTrigger>
        <AccordionContent className="bg-card rounded-md p-2  mt-2 max-h-[36rem] overflow-x-auto">
          <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border flex gap-2 overflow-x-auto">
            {results.map((result) => (
              <Card
                key={result.metadata.source}
                className="hover:shadow-md transition-shadow flex-shrink-0 w-64 min-w-64"
              >
                <CardHeader className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1 items-start w-full">
                    <div className="flex flex-row items-center gap-2 w-full">
                      <Favicon
                        url={result.metadata.source}
                        size={28}
                        className="h-6 w-6 rounded object-contain"
                        fallbackIcon={GlobeIcon}
                      />

                      <a
                        href={result.metadata.source}
                        title={result.metadata.title}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm leading-snug text-foreground line-clamp-2 overflow-hidden break-words whitespace-normal flex-1 text-left hover:underline"
                        aria-label={`Open ${result.metadata.title} in new tab`}
                      >
                        {result.metadata.title}
                      </a>
                      <ExternalLinkIcon className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <GlobeIcon className="h-3 w-3" />
                        {extractDomain(result.metadata.source)}
                      </span>
                      {result.metadata.publishedDate ? (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {formatDate(result.metadata.publishedDate) ?? ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Markdown
                    content={`${result.pageContent.slice(0, 300)}...`}
                    id={result.metadata.source}
                    className="text-xs text-muted-foreground"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
