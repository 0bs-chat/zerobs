import { memo, useMemo } from "react";
import { Reasoning } from "./ai-message/reasoning";
import { Markdown } from "@/components/ui/markdown";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SearchResultDisplay, type SearchResult } from "./ai-message/tool-message/search-results";
import type { ToolChunkGroup, AIChunkGroup } from "@/hooks/chats/use-stream";

const StreamingToolCall = memo(({ tool }: { tool: ToolChunkGroup }) => {
  // Memoize the parsed tool output to avoid unnecessary parsing
  const parsedOutput = useMemo(() => {
    if (!tool.output || !tool.isComplete) return null;

    // Handle searchWeb tool results
    if (tool.toolName === "searchWeb") {
      try {
        // The output might be a LangChain ToolMessage structure
        let content: string;
        
        if (typeof tool.output === "object" && tool.output !== null) {
          // Check if it's a LangChain ToolMessage structure
          if ("kwargs" in tool.output && typeof tool.output.kwargs === "object" && tool.output.kwargs !== null && "content" in tool.output.kwargs) {
            content = tool.output.kwargs.content as string;
          } else if ("content" in tool.output) {
            content = tool.output.content as string;
          } else {
            content = JSON.stringify(tool.output);
          }
        } else {
          content = String(tool.output);
        }

        // Parse the search results from the content
        const results = JSON.parse(content) as SearchResult[];
        return { type: "searchWeb", results };
      } catch (err) {
        console.error("Failed to parse search results from streaming tool output", err);
        return { type: "generic", content: tool.output };
      }
    }

    return { type: "generic", content: tool.output };
  }, [tool.output, tool.isComplete, tool.toolName]);

  // Memoize the tool call content to prevent unnecessary re-renders
  const toolContent = useMemo(() => (
    <AccordionContent className="bg-card rounded-md p-2 border mt-2 max-h-[36rem] overflow-y-auto">
      {tool.input !== undefined && (
        <div className="mb-2">
          <div className="text-xs font-medium text-muted-foreground mb-1">Input:</div>
          <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
            {JSON.stringify(tool.input, null, 2)}
          </pre>
        </div>
      )}
      {tool.output !== undefined && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
          {parsedOutput?.type === "searchWeb" ? (
            <SearchResultDisplay results={parsedOutput.results || []} />
          ) : (
            <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
              {JSON.stringify(tool.output, null, 2)}
            </pre>
          )}
        </div>
      )}
      {!tool.isComplete && !tool.output && (
        <div className="text-xs text-muted-foreground italic">
          Tool call in progress...
        </div>
      )}
    </AccordionContent>
  ), [tool.input, tool.output, tool.isComplete, parsedOutput]);

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="streaming-tool" className="px-0 border-none">
        <AccordionTrigger className="py-1 gap-2 text-xs font-semibold items-center justify-start">
          <span className="text-muted-foreground translate-y-[.1rem]">
            Tool Call ({tool.toolName}) {tool.isComplete ? "✓" : "..."}
          </span>
        </AccordionTrigger>
        {toolContent}
      </AccordionItem>
    </Accordion>
  );
});

StreamingToolCall.displayName = "StreamingToolCall";

interface ChunkRendererProps {
  chunkGroups: (AIChunkGroup | ToolChunkGroup)[];
  showTypingIndicator?: boolean;
  messageIdPrefix?: string;
}

export const ChunkRenderer = memo(({ 
  chunkGroups, 
  showTypingIndicator = false,
  messageIdPrefix = "chunk"
}: ChunkRendererProps) => {
  // Memoize the chunk groups rendering
  const renderedChunks = useMemo(() => {
    if (!chunkGroups?.length) return null;

    return chunkGroups.map((chunk, index) => {
      if (chunk.type === "ai") {
        return (
          <div key={`ai-${index}`}>
            {chunk.reasoning && (
              <Reasoning 
                reasoning={chunk.reasoning} 
                messageId={`${messageIdPrefix}-${index}`} 
              />
            )}
            {chunk.content && (
              <div className="relative">
                <Markdown 
                  content={chunk.content} 
                  id={`${messageIdPrefix}-content-${index}`}
                />
                {/* Show typing indicator if this is the last AI chunk and content ends mid-sentence */}
                {showTypingIndicator && index === chunkGroups.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                )}
              </div>
            )}
          </div>
        );
      } else if (chunk.type === "tool") {
        return (
          <StreamingToolCall 
            key={`tool-${index}`} 
            tool={chunk} 
          />
        );
      }
      return null;
    });
  }, [chunkGroups, showTypingIndicator, messageIdPrefix]);

  return <>{renderedChunks}</>;
});

ChunkRenderer.displayName = "ChunkRenderer"; 