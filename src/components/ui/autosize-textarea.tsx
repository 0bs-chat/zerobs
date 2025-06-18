"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export type AutosizeTextAreaRef = {
  textArea: HTMLTextAreaElement;
  maxHeight: number;
  minHeight: number;
  focus: () => void;
};

type AutosizeTextAreaProps = {
  maxHeight?: number;
  minHeight?: number;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const AutosizeTextarea = React.forwardRef<
  AutosizeTextAreaRef,
  AutosizeTextAreaProps
>(
  (
    {
      maxHeight = Number.MAX_SAFE_INTEGER,
      minHeight = 52,
      className,
      onChange,
      value,
      defaultValue,
      ...props
    }: AutosizeTextAreaProps,
    ref: React.Ref<AutosizeTextAreaRef>,
  ) => {
    const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [internalValue, setInternalValue] = React.useState(
      value !== undefined ? String(value) : String(defaultValue || ""),
    );

    // Auto-resize function
    const autoResize = React.useCallback(() => {
      const textArea = textAreaRef.current;
      if (!textArea) return;

      // Reset height to auto to get the correct scrollHeight
      textArea.style.height = "auto";

      // Calculate the desired height
      const scrollHeight = textArea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

      // Set the new height
      textArea.style.height = `${newHeight}px`;

      // Handle overflow - enable scrolling when content exceeds maxHeight
      if (scrollHeight > maxHeight) {
        textArea.style.overflowY = "auto";
      } else {
        textArea.style.overflowY = "hidden";
      }
    }, [minHeight, maxHeight]);

    // Handle value changes from props
    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(String(value));
      }
    }, [value]);

    // Handle defaultValue changes (for TanStack Router)
    React.useEffect(() => {
      if (value === undefined && defaultValue !== undefined) {
        setInternalValue(String(defaultValue));
      }
    }, [defaultValue, value]);

    // Auto-resize when internal value changes
    React.useEffect(() => {
      // Use setTimeout to ensure the DOM has updated
      const timeoutId = setTimeout(autoResize, 0);
      return () => clearTimeout(timeoutId);
    }, [internalValue, autoResize]);

    // Initial setup
    React.useEffect(() => {
      const textArea = textAreaRef.current;
      if (!textArea) return;

      // Set initial styles
      textArea.style.minHeight = `${minHeight}px`;
      textArea.style.maxHeight = `${maxHeight}px`;
      textArea.style.resize = "none";

      // Initial resize
      autoResize();
    }, [minHeight, maxHeight, autoResize]);

    // Handle change events
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      onChange?.(e);
    };

    // Expose ref methods
    React.useImperativeHandle(ref, () => ({
      textArea: textAreaRef.current as HTMLTextAreaElement,
      focus: () => textAreaRef.current?.focus(),
      maxHeight,
      minHeight,
    }));

    return (
      <textarea
        {...props}
        ref={textAreaRef}
        value={value !== undefined ? value : internalValue}
        onChange={handleChange}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    );
  },
);

AutosizeTextarea.displayName = "AutosizeTextarea";
