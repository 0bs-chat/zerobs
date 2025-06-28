import { useCallback, useState } from "react";

export function useCopy(
  options: {
    duration?: number;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  } = {},
) {
  const { duration = 1000, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), duration);
        onSuccess?.();
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to copy text");
        console.error("Failed to copy text:", error);
        onError?.(error);
      }
    },
    [duration, onSuccess, onError],
  );

  return {
    copy,
    copied,
  };
}
