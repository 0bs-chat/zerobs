import { cn } from "@/lib/utils";
import {
  formatTokenCount,
  getTokenUsagePercentage,
  TOKEN_LIMIT,
} from "./token-counter";

interface TokenProgressBarProps {
  usedTokens: number;
  totalTokens?: number;
  className?: string;
  showPercentage?: boolean;
}

export function TokenProgressBar({
  usedTokens,
  totalTokens = TOKEN_LIMIT,
  className,
  showPercentage = true,
}: TokenProgressBarProps) {
  const percentage = getTokenUsagePercentage(usedTokens, totalTokens);
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            isAtLimit
              ? "bg-destructive"
              : isNearLimit
                ? "bg-yellow-500"
                : "bg-primary"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Token count and percentage */}
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-medium",
            isAtLimit ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {formatTokenCount(usedTokens)} / {formatTokenCount(totalTokens)}{" "}
          tokens
        </span>

        {showPercentage && (
          <span
            className={cn(
              "text-xs",
              isAtLimit ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Warning message */}
      {isAtLimit && (
        <p className="text-xs text-destructive">
          Token limit reached. Remove some files to add more.
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-yellow-600">
          Approaching token limit. Consider removing some files.
        </p>
      )}
    </div>
  );
}
