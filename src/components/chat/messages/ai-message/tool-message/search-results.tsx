import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Favicon } from "@/components/ui/favicon";
import { Markdown } from "@/components/ui/markdown";
import { extractDomain } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
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
  results: SearchResult[];
}

export const SearchResultDisplay = ({ results }: SearchResultDisplayProps) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No search results found
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full" defaultValue={["web-search-results"]}>
      <AccordionItem value="web-search-results" className="px-0 border-none">
        <AccordionTrigger className="flex items-center justify-start gap-2 text-sm text-muted-foreground py-0">
          <div className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4" />
            <span className="text-muted-foreground translate-y-[.1rem]">
              Web Search Results ({results.length})
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border flex gap-4 overflow-x-auto p-2">
            {results.map((result, index) => (
              <Link
                key={index}
                to={result.metadata.source}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col flex-shrink-0 rounded-lg border bg-card text-left transition-all duration-200 hover:shadow-lg hover:border-primary/20 hover:bg-accent/50 w-64 min-w-64 overflow-hidden"
                aria-label={`Open ${result.metadata.title} in new tab`}
              >
                <img
                  alt=""
                  className="aspect-video h-36 overflow-hidden object-cover"
                  src={`https://api.microlink.io/?url=${encodeURIComponent(
                    result.metadata.source,
                  )}&screenshot=true&meta=false&embed=screenshot.url`}
                  style={{ margin: "0px auto", maxHeight: "100%" }}
                />
                <div className="flex flex-1 flex-col p-2">
                  <div className="flex items-center justify-start gap-2">
                      {result.metadata.favicon && (
                        <Favicon
                          url={result.metadata.source}
                          className="w-6 h-6 rounded-full object-contain"
                        />
                      )}
                    <h1 className="leading m-0 mb-0 truncate font-semibold text-base text-foreground">
                      {result.metadata.title}
                    </h1>
                  </div>
                  <Markdown
                    content={`${result.pageContent.slice(0, 100)}...`}
                    id={result.metadata.source}
                    className="line-clamp-3 text-sm leading-relaxed text-muted-foreground"
                  />
                  <div className="mt-auto flex items-center gap-1.5 border-t border-border/50 pt-2">
                    <span className="flex-1 truncate text-xs text-muted-foreground/70">
                      {extractDomain(result.metadata.source)}
                    </span>
                    <ExternalLinkIcon className="lucide lucide-external-link size-3 flex-shrink-0 text-muted-foreground/50" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
