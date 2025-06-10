import { useAtomValue } from "jotai";
import { Progress } from "@/components/ui/progress";
import {
  selectedFilesAtom,
  tokenUsageAtom,
  maxTokensAtom,
  tokenUsagePercentageAtom,
  isAtTokenLimitAtom,
} from "@/store/github";

function TokenUsageCounter() {
  const selectedFiles = useAtomValue(selectedFilesAtom);
  const tokenUsage = useAtomValue(tokenUsageAtom);
  const maxTokens = useAtomValue(maxTokensAtom);
  const tokenPercentage = useAtomValue(tokenUsagePercentageAtom);
  const isAtLimit = useAtomValue(isAtTokenLimitAtom);

  const getTextColor = () => {
    if (isAtLimit) return "text-destructive";
    if (tokenPercentage >= 80) return "text-yellow-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-3 rounded-lg">
      <Progress value={tokenPercentage} className="w-40 flex" />

      <div className="flex items-center justify-between text-sm">
        <span className={getTextColor()}>
          {Math.round(tokenPercentage)}% used ({tokenUsage} / {maxTokens})
        </span>
        {isAtLimit && (
          <span className="text-destructive font-medium">
            Token limit reached
          </span>
        )}
        {!isAtLimit && tokenPercentage >= 80 && (
          <span className="text-yellow-600 font-medium">Approaching limit</span>
        )}
      </div>

      {selectedFiles.size > 0 && (
        <div className="text-xs text-muted-foreground">
          {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""}{" "}
          selected
        </div>
      )}
    </div>
  );
}

export default TokenUsageCounter;
