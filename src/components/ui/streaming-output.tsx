import { Loader2, Check, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface StreamingOutputProps {
  content: string;
  isComplete?: boolean;
  className?: string;
  showHeader?: boolean;
  collapsible?: boolean;
}

export function StreamingOutput({
  content,
  isComplete,
  className = "",
  showHeader = true,
  collapsible = false,
}: StreamingOutputProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const showCursor = isComplete === false;

  const { lastLine } = useMemo(() => {
    const allLines = (content || "").split(/\n+/).filter(Boolean);
    return {
      lastLine: allLines.length > 0 ? allLines[allLines.length - 1] : "",
    };
  }, [content]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  if (!content) {
    if (isComplete === false) {
      return (
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border p-2 text-xs",
            className
          )}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Waiting...</span>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border p-2 text-xs",
          className
        )}
      >
        <Terminal className="h-3 w-3" />
        <span>No output</span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="rounded-lg border">
        {showHeader && (
          <div className="flex items-center justify-between gap-2 rounded-t-lg border-b px-3 py-2">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <Terminal className="h-3.5 w-3.5 shrink-0" />
            </div>
            <div className="flex items-center gap-1">
              {collapsible && (
                <button
                  onClick={toggleCollapsed}
                  className="rounded-sm p-1 hover:bg-muted"
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              {isComplete === true ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : isComplete === false ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </div>
          </div>
        )}
        {!isCollapsed && (
          <div className="p-3">
            {lastLine && (
              <div
                className={cn(
                  "rounded-md  py-2 font-mono text-xs leading-relaxed"
                )}
              >
                <code className="break-all" title={lastLine}>
                  {lastLine}
                </code>
                {showCursor && (
                  <span className="ml-1 inline-block h-3 w-0.5 animate-pulse" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
