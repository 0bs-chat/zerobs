import { useRef, useCallback } from "react";
import type { AutosizeTextAreaRef } from "@/components/ui/autosize-textarea";

let textAreaRef: AutosizeTextAreaRef | null = null;

export const useTextAreaRef = () => {
  const ref = useRef<AutosizeTextAreaRef | null>(null);

  const setRef = useCallback((instance: AutosizeTextAreaRef | null) => {
    ref.current = instance;
    textAreaRef = instance;
  }, []);

  const getRef = useCallback(() => {
    return ref.current || textAreaRef;
  }, []);

  const focus = useCallback(() => {
    const currentRef = getRef();
    if (currentRef?.textArea) {
      currentRef.textArea.focus();
    }
  }, [getRef]);

  const setValue = useCallback(
    (value: string) => {
      const currentRef = getRef();
      if (currentRef?.textArea) {
        currentRef.textArea.value = value;
        // Trigger any necessary updates
        const event = new Event("input", { bubbles: true });
        currentRef.textArea.dispatchEvent(event);
      }
    },
    [getRef],
  );

  const getValue = useCallback(() => {
    const currentRef = getRef();
    return currentRef?.textArea?.value || "";
  }, [getRef]);

  const clear = useCallback(() => {
    setValue("");
  }, [setValue]);

  return {
    ref,
    setRef,
    getRef,
    focus,
    setValue,
    getValue,
    clear,
  };
};
