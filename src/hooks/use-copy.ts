import { useCallback, useState } from "react";

export interface UseCopyOptions {
  /**
   * Duration in milliseconds to show the copied state
   * @default 1000
   */
  duration?: number;
  /**
   * Callback to execute on successful copy
   */
  onSuccess?: () => void;
  /**
   * Callback to execute on copy error
   */
  onError?: (error: Error) => void;
}

export function useCopy(options: UseCopyOptions = {}) {
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
    [duration, onSuccess, onError]
  );

  return {
    copy,
    copied,
  };
}
