import { useState, useEffect, useCallback, useRef } from "react";
import type { ChunkGroup } from "../../../convex/langchain/state";
import type { MessageGroup } from "@/../convex/chatMessages/helpers";

interface UseScrollOptions {
  streamData?: {
    chunkGroups: ChunkGroup[];
    status?: string;
  };
  groupedMessages?: MessageGroup[];
  isEmpty?: boolean;
  isLoading?: boolean;
}

export const useScroll = (options: UseScrollOptions = {}) => {
  const { streamData, groupedMessages, isEmpty, isLoading } = options;
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userHasScrolledAway, setUserHasScrolledAway] = useState(false);
  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const findScrollContainer = useCallback(() => {
    // Try to find the scroll container with multiple strategies
    const selectors = [
      '[data-slot="scroll-area-viewport"]', // Radix scroll area viewport
      "[data-radix-scroll-area-viewport]", // Alternative Radix selector
      ".chat-messages-scroll-area", // Our class
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const htmlElement = element as HTMLElement;
        // Check if this element has content that can scroll
        if (htmlElement.scrollHeight > htmlElement.clientHeight + 10) {
          return htmlElement;
        }
      }
    }

    return null;
  }, []);

  const checkScrollPosition = useCallback(() => {
    const scrollContainer = findScrollContainer();

    if (!scrollContainer) {
      setIsAtBottom(true);
      return true;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const threshold = 50; // Generous threshold
    const atBottom = scrollHeight - scrollTop <= clientHeight + threshold;

    setIsAtBottom(atBottom);
    lastScrollTopRef.current = scrollTop;

    return atBottom;
  }, [findScrollContainer]);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      const scrollContainer = findScrollContainer();
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior,
        });
        setUserHasScrolledAway(false);
        setIsAtBottom(true);
      }
    },
    [findScrollContainer],
  );

  const handleScroll = useCallback(() => {
    const scrollContainer = findScrollContainer();
    if (!scrollContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const threshold = 50;
    const atBottom = scrollHeight - scrollTop <= clientHeight + threshold;
    const scrollDelta = Math.abs(scrollTop - lastScrollTopRef.current);

    // Only set userHasScrolledAway if it's a significant scroll movement upward
    if (scrollDelta > 5 && scrollTop < lastScrollTopRef.current) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (!atBottom) {
          setUserHasScrolledAway(true);
        }
      }, 150);
    }

    lastScrollTopRef.current = scrollTop;
    setIsAtBottom(atBottom);

    // Reset scrolled away state if user scrolled back to bottom
    if (atBottom) {
      setUserHasScrolledAway(false);
    }
  }, [findScrollContainer]);

  const shouldAutoScroll = isAtBottom && !userHasScrolledAway;

  // Auto-scroll during streaming only if user hasn't scrolled away
  useEffect(() => {
    if (shouldAutoScroll && streamData?.chunkGroups && streamData.chunkGroups.length > 0) {
      scrollToBottom("smooth");
    }
  }, [streamData?.chunkGroups?.length, shouldAutoScroll, scrollToBottom]);

  // Auto-scroll when new messages arrive (non-streaming)
  useEffect(() => {
    if (shouldAutoScroll && groupedMessages && groupedMessages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [groupedMessages?.length, shouldAutoScroll, scrollToBottom]);

  // Initial scroll to bottom when chat loads
  useEffect(() => {
    if (!isEmpty && !isLoading) {
      scrollToBottom("auto");
    }
  }, [isEmpty, isLoading, scrollToBottom]);

  // Setup effect
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setup = () => {
      const scrollContainer = findScrollContainer();

      if (scrollContainer) {
        // Add scroll listener
        scrollContainer.addEventListener("scroll", handleScroll, {
          passive: true,
        });

        // Initial check
        checkScrollPosition();

        // Watch for content changes
        const observer = new MutationObserver(() => {
          // Debounce the check
          setTimeout(checkScrollPosition, 100);
        });

        observer.observe(scrollContainer, {
          childList: true,
          subtree: true,
        });

        cleanup = () => {
          scrollContainer.removeEventListener("scroll", handleScroll);
          observer.disconnect();
        };
      } else {
        // If no container found, try again later
        const retryTimeout = setTimeout(setup, 500);
        cleanup = () => clearTimeout(retryTimeout);
      }
    };

    setup();

    return () => {
      cleanup?.();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, checkScrollPosition, findScrollContainer]);

  // Force periodic updates to ensure accuracy
  useEffect(() => {
    const interval = setInterval(() => {
      checkScrollPosition();
    }, 2000);

    return () => clearInterval(interval);
  }, [checkScrollPosition]);

  return {
    scrollToBottom,
    isAtBottom,
    userHasScrolledAway,
    shouldAutoScroll,
  };
};
