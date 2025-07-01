"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type AutosizeTextAreaProps = {
  maxHeight?: number;
  minHeight?: number;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const AutosizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutosizeTextAreaProps
>(
  (
    {
      maxHeight = Number.MAX_SAFE_INTEGER,
      minHeight = 52,
      className,
      onChange,
      ...props
    }: AutosizeTextAreaProps,
    ref
  ) => {
    const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(ref, () => textAreaRef.current!);

    const autoResize = React.useCallback(() => {
      const textArea = textAreaRef.current;
      if (!textArea) return;

      // Reset height to auto to get the correct scrollHeight
      textArea.style.height = "auto";

      textArea.style.height = "auto";

      // Calculate the desired height
      const scrollHeight = textArea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

      // Set the new height
      textArea.style.height = `${newHeight}px`;

      // Handle overflow - enable scrolling when content exceeds maxHeight
      if (scrollHeight > maxHeight) {
        textArea.style.overflowY = "auto";
        textArea.style.overflowY = "auto";
      } else {
        textArea.style.overflowY = "hidden";
        textArea.style.overflowY = "hidden";
      }
    }, [minHeight, maxHeight]);

    // Initial resize on mount
    React.useEffect(() => {
      autoResize();
    }, [autoResize]);

    // Handle change events
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // We manually trigger the resize on every change
      autoResize();
      // And propagate the onChange event to the parent if it exists
      onChange?.(e);
    };

    return (
      <textarea
        {...props}
        ref={textAreaRef}
        onChange={handleChange}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    );
  }
);

AutosizeTextarea.displayName = "AutosizeTextarea";
AutosizeTextarea.displayName = "AutosizeTextarea";
