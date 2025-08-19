import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Favicon } from "@/components/ui/favicon";
import { extractDomain } from "@/lib/utils";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";

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
      className="w-full border p-1.5 dark:border-border/50 bg-card  rounded-lg"
    >
      <AccordionItem value="web-search-results" className="px-0 border-none">
        <AccordionTrigger
          showIcon={false}
          className="py-1 gap-2 text-xs font-medium items-center justify-start text-foreground/50  cursor-pointer"
        >
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <GlobeIcon className="w-4 h-4" />
              <span className="text-foreground/50">Web Search</span>
            </div>
            {input?.query ? (
              <div className="text-[11px] text-muted-foreground truncate max-w-[50%]">
                {String(input.query)}
              </div>
            ) : null}
          </div>
        </AccordionTrigger>
        <AccordionContent className="bg-card rounded-md p-2 mt-2 overflow-x-auto ">
          <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border flex gap-2 overflow-x-auto snap-x snap-mandatory pr-1 pb-1">
            {results.map((result) => (
              <a
                key={result.metadata.source}
                href={result.metadata.source}
                title={result.metadata.title}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${result.metadata.title} in new tab`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
              >
                <div className="w-64 min-w-64 h-28 rounded-md border border-border/50 p-3 flex flex-col justify-between bg-muted snap-start text-foreground/50 transition-colors hover:bg-card">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2  justify-center">
                      <Favicon
                        url={result.metadata.source}
                        size={16}
                        className="h-3.5 w-3.5 rounded object-contain"
                        fallbackIcon={GlobeIcon}
                      />
                      <span className="text-xs font-medium truncate break-words">
                        {extractDomain(result.metadata.source)}
                      </span>
                    </div>
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-sm leading-snug line-clamp-2 break-words">
                    {result.metadata.title}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
