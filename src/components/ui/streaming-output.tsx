import { Loader2 } from "lucide-react";

interface StreamingOutputProps {
  content: string;
  isComplete?: boolean;
  className?: string;
}

export function StreamingOutput({
  content,
  isComplete,
  className = "",
}: StreamingOutputProps) {
  if (!content && isComplete !== false) {
    return (
      <div className={`text-xs text-muted-foreground italic ${className}`}>
        No output
      </div>
    );
  }

  if (!content && isComplete === false) {
    return (
      <div
        className={`text-xs text-muted-foreground italic flex items-center gap-2 ${className}`}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Waiting for output...
      </div>
    );
  }

  const showCursor = isComplete === false;
  return (
    <div className={className}>
      <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
        {content}
        {showCursor && <span className="animate-pulse text-yellow-500">|</span>}
      </pre>
    </div>
  );
}
