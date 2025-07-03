import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, UserIcon, GlobeIcon } from "lucide-react";
import { Favicon } from "@/components/ui/favicon";
import { Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionTrigger,
  AccordionItem,
  AccordionContent
} from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown";

// Type definition for search results output
export type SearchResultMetadata = {
  type: string;           // e.g., "search"
  title: string;          // Page title
  source: string;         // URL of the source
  publishedDate: string;  // ISO date string
  author: string;         // Author name (can be empty)
  image?: string;         // Optional image URL
  favicon?: string;       // Optional favicon URL
};

export type SearchResult = {
  pageContent: string;           // Full text content of the page
  metadata: SearchResultMetadata; // Metadata about the source
};

interface SearchResultDisplayProps {
  results: SearchResult[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

const extractDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

export const SearchResultDisplay = ({ results }: SearchResultDisplayProps) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No search results found
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="web-search-results" className="px-0 border-none">
        <AccordionTrigger className="flex items-center justify-start gap-2 text-sm text-muted-foreground py-0">
          <div className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4" />
            <span className="text-muted-foreground translate-y-[.1rem]">Web Search Results ({results.length})</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[36rem] overflow-y-auto">
          {results.map((result, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex flex-row items-start justify-between">
                  <div className="flex flex-col gap-1 items-start flex-1 min-w-0">
                    <div className="flex flex-row items-center gap-2">
                      {result.metadata.favicon && (
                        <Favicon 
                          url={result.metadata.source}
                          className="w-4 h-4 flex-shrink-0"
                        />
                      )}
                      <h3 className="font-medium text-sm leading-tight text-foreground truncate break-words whitespace-pre-wrap">
                        {result.metadata.title || "Untitled"}
                      </h3>
                    </div>
                  </div>
                          
                  {result.metadata.image && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="w-12 h-12 rounded border overflow-hidden bg-muted">
                        <img
                          src={result.metadata.image} 
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <GlobeIcon className="h-3 w-3" />
                    <Link to={result.metadata.source} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{extractDomain(result.metadata.source)}</Link>
                  </span>
                  
                  {result.metadata.publishedDate && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDate(result.metadata.publishedDate)}
                      </span>
                    </>
                  )}
                  
                  {result.metadata.author && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <span className="flex items-center gap-1 truncate">
                        <UserIcon className="h-3 w-3" />
                        <span className="truncate">{result.metadata.author}</span>
                      </span>
                    </>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <Markdown content={`${result.pageContent.slice(0, 300)}...`} id={result.metadata.source} className="text-xs text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
