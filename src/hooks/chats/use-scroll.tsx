import { useState, useEffect, useCallback, useRef } from "react";

export const useScroll = () => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userHasScrolledAway, setUserHasScrolledAway] = useState(false);
  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      const scrollContainer = document.querySelector(
        '[data-slot="scroll-area-viewport"]',
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior,
        });
        // Reset user scrolled away state when we programmatically scroll
        setUserHasScrolledAway(false);
        // Also update the isAtBottom state immediately to avoid button flickering
        setIsAtBottom(true);
      }
    },
    [],
  );

  const handleScroll = useCallback(() => {
    const scrollContainer = document.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (scrollContainer) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const atBottom = scrollHeight - scrollTop <= clientHeight + 5;

      // Check if user manually scrolled (not programmatic)
      const scrollDelta = Math.abs(scrollTop - lastScrollTopRef.current);
      if (scrollDelta > 1) {
        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Set a timeout to detect if this was user-initiated scrolling
        scrollTimeoutRef.current = setTimeout(() => {
          if (!atBottom) {
            setUserHasScrolledAway(true);
          }
        }, 100);
      }

      lastScrollTopRef.current = scrollTop;
      setIsAtBottom(atBottom);

      // If user scrolled back to bottom manually, reset the scrolled away state
      if (atBottom) {
        setUserHasScrolledAway(false);
      }
    }
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      // Initial check
      handleScroll();
      return () => {
        scrollContainer.removeEventListener("scroll", handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);

  return {
    scrollToBottom,
    isAtBottom,
    userHasScrolledAway,
    shouldAutoScroll: isAtBottom && !userHasScrolledAway,
  };
};
