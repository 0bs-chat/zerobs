"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useImperativeHandle } from "react";

interface UseAutosizeTextAreaProps {
  textAreaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  minHeight?: number;
  maxHeight?: number;
  triggerAutoSize: string;
}

export const useAutosizeTextArea = ({
  textAreaRef,
  triggerAutoSize,
  maxHeight = Number.MAX_SAFE_INTEGER,
  minHeight = 0,
}: UseAutosizeTextAreaProps) => {
  React.useEffect(() => {
    const textAreaElement = textAreaRef.current;
    if (!textAreaElement) return;

    const offsetBorder = 6;

    // Always set min and max height constraints
    textAreaElement.style.minHeight = `${minHeight + offsetBorder}px`;
    if (maxHeight > minHeight) {
      textAreaElement.style.maxHeight = `${maxHeight}px`;
    }

    // Use requestAnimationFrame to ensure the DOM is ready
    const adjustHeight = () => {
      // Reset height to calculate proper scrollHeight
      textAreaElement.style.height = `${minHeight + offsetBorder}px`;

      // Get the actual content height
      const scrollHeight = textAreaElement.scrollHeight;

      // Apply appropriate height based on content
      if (scrollHeight > minHeight + offsetBorder) {
        if (scrollHeight > maxHeight) {
          textAreaElement.style.height = `${maxHeight}px`;
        } else {
          textAreaElement.style.height = `${scrollHeight}px`;
        }
      }
    };

    // Use requestAnimationFrame to ensure proper timing
    requestAnimationFrame(adjustHeight);
  }, [triggerAutoSize, maxHeight, minHeight]);
};

export type AutosizeTextAreaRef = {
  textArea: HTMLTextAreaElement;
  maxHeight: number;
  minHeight: number;
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
      ...props
    }: AutosizeTextAreaProps,
    ref: React.Ref<AutosizeTextAreaRef>
  ) => {
    const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [triggerAutoSize, setTriggerAutoSize] = React.useState("");

    useAutosizeTextArea({
      textAreaRef,
      triggerAutoSize: triggerAutoSize,
      maxHeight,
      minHeight,
    });

    useImperativeHandle(ref, () => ({
      textArea: textAreaRef.current as HTMLTextAreaElement,
      focus: () => textAreaRef?.current?.focus(),
      maxHeight,
      minHeight,
    }));

    // Initialize triggerAutoSize with the initial value
    React.useEffect(() => {
      const initialValue = value || props?.defaultValue || "";
      setTriggerAutoSize(initialValue as string);
    }, [props?.defaultValue, value]);

    return (
      <textarea
        {...props}
        value={value}
        ref={textAreaRef}
        className={cn(
          "flex w-full rounded-md border border-input bg-background p-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onChange={(e) => {
          setTriggerAutoSize(e.target.value);
          onChange?.(e);
        }}
      />
    );
  }
);
AutosizeTextarea.displayName = "AutosizeTextarea";
