import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Favicon } from "@/components/ui/favicon";
import { Markdown } from "@/components/ui/markdown";
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
      <div className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
        No search results found
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      className="w-full py-1.5 rounded-lg cursor-pointer"
      // defaultValue={["web-search-results"]} // Remove this line to keep it closed by default
    >
      <AccordionItem value="web-search-results" className="px-0 border-none">
        <AccordionTrigger
          className={`flex items-center gap-2 text-sm text-muted-foreground py-0 justify-start`}
        >
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex items-center gap-2 cursor-pointer">
              <GlobeIcon className="h-4 w-4" />
              <span className="text-muted-foreground ">
                Web Search Results ({results.length})
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {input?.query as string}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border flex gap-4 overflow-x-auto p-2">
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() =>
                  window.open(
                    result.metadata.source,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    window.open(
                      result.metadata.source,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }
                }}
                tabIndex={0}
                role="button"
                className="group relative flex flex-col flex-shrink-0 rounded-lg border bg-card text-left transition-all
                  duration-200 hover:shadow-lg hover:border-primary/20 hover:bg-accent/50 w-64 min-w-64 overflow-hidden
                  [&:hover]:shadow-lg [&:hover]:border-primary/20 [&:hover]:bg-accent/50 h-96 cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={`Open ${result.metadata.title} in new tab`}
              >
                <div className="w-full h-36 overflow-hidden flex-shrink-0">
                  <img
                    alt=""
                    className="w-full h-full object-cover"
                    src={`https://api.microlink.io/?url=${encodeURIComponent(
                      result.metadata.image || result.metadata.source
                    )}&screenshot=true&meta=false&embed=screenshot.url`}
                  />
                </div>
                <div className="flex flex-1 flex-col p-2 min-h-0">
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
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <Markdown
                      content={`${result.pageContent.slice(0, 500)}...`}
                      id={result.metadata.source}
                      className="prose prose-h1:text-xs prose-h2:text-xs prose-h3:text-xs prose-h4:text-xs prose-h5:text-xs prose-h6:text-xs
                        prose-p:text-xs prose-li:text-xs prose-ul:text-xs prose-ol:text-xs prose-blockquote:text-xs prose-img:text-xs
                        prose-strong:text-xs prose-em:text-xs prose-a:text-xs prose-a:underline prose-a:text-primary text-muted-foreground overflow-hidden"
                    />
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 border-t border-border/50 pt-2">
                    <span className="flex-1 truncate text-xs text-muted-foreground/70">
                      {extractDomain(result.metadata.source)}
                    </span>
                    <ExternalLinkIcon className="lucide lucide-external-link size-3 flex-shrink-0 text-muted-foreground/50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
