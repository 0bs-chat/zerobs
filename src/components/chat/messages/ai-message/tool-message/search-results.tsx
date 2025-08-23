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
  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  return (
    <Accordion
      type="multiple"
      className="w-full bg-accent/20 px-2 py-2 rounded-lg cursor-pointer"
      // defaultValue={["web-search-results"]} // Remove this line to keep it closed by default
    >
      <AccordionItem value="web-search-results" className="px-0 border-none">
        <AccordionTrigger
          showIcon={false}
          className={`flex items-center gap-2 text-sm text-muted-foreground py-0 justify-start`}
        >
          <div className="flex flex-row items-center justify-between w-full">
            <div className="flex items-center gap-2 cursor-pointer">
              <GlobeIcon className="h-4 w-4" />
              <span className="text-muted-foreground">Web Search Results</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-muted/50 text-muted-foreground/90 font-mono">
                {results.length}
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
              <a
                key={index}
                href={result.metadata.source}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col flex-shrink-0 rounded-lg border bg-card text-left transition-all
                  duration-200 hover:shadow-lg hover:border-primary/20 hover:bg-accent/50 w-64 min-w-64 overflow-hidden h-96
                  focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={`Open ${result.metadata.title} in new tab`}
              >
                <div className="relative w-full h-36 overflow-hidden flex-shrink-0">
                  <img
                    alt={
                      result.metadata.title ||
                      extractDomain(result.metadata.source)
                    }
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback to source preview if image is invalid
                      const el = e.currentTarget as HTMLImageElement;
                      const fallback = `https://api.microlink.io/?url=${encodeURIComponent(result.metadata.source)}&screenshot=true&meta=false&embed=screenshot.url`;
                      if (el.src !== fallback) el.src = fallback;
                    }}
                    src={`https://api.microlink.io/?url=${encodeURIComponent(
                      result.metadata.image || result.metadata.source
                    )}&screenshot=true&meta=false&embed=screenshot.url`}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/80 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-2 min-h-0 gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {result.metadata.favicon && (
                        <Favicon
                          url={result.metadata.source}
                          className="w-4 h-4 rounded object-contain"
                        />
                      )}
                      <span className="truncate text-xs text-muted-foreground/70">
                        {extractDomain(result.metadata.source)}
                      </span>
                    </div>
                    {result.metadata.publishedDate && (
                      <span className="shrink-0 rounded-sm bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground/80">
                        {formatDate(result.metadata.publishedDate)}
                      </span>
                    )}
                  </div>
                  <h2 className="m-0 line-clamp-2 truncate font-semibold text-foreground">
                    {result.metadata.title}
                  </h2>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <Markdown
                      content={`${result.pageContent.slice(0, 500)}...`}
                      id={result.metadata.source}
                      className="prose prose-h1:text-xs prose-h2:text-xs prose-h3:text-xs prose-h4:text-xs prose-h5:text-xs prose-h6:text-xs
                        prose-p:text-xs prose-li:text-xs prose-ul:text-xs prose-ol:text-xs prose-blockquote:text-xs prose-img:text-xs
                        prose-strong:text-xs prose-em:text-xs prose-a:text-xs prose-a:underline prose-a:text-primary text-muted-foreground overflow-hidden"
                    />
                  </div>
                  <div className="mt-auto flex items-center gap-2 border-t border-border/50 pt-2">
                    {result.metadata.author && (
                      <span className="truncate text-[10px] text-muted-foreground/70">
                        {result.metadata.author}
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                      Visit
                      <ExternalLinkIcon className="size-3 flex-shrink-0" />
                    </span>
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
