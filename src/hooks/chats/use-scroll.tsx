import { type RefObject, useState, useEffect, useCallback } from "react";

export const useScroll = (
  scrollAreaRef: RefObject<HTMLDivElement | null>,
) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    scrollAreaRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = useCallback(() => {
    const scrollContainer = document.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (scrollContainer) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const atBottom = scrollHeight - scrollTop <= clientHeight + 5;
      setIsAtBottom(atBottom);
    }
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return { scrollToBottom, isAtBottom };
};