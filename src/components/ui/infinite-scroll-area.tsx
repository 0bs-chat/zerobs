import * as React from "react";
import { Loader2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface InfiniteScrollAreaProps<T> {
  data: T[];
  error: Error | null;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: () => number;
  overscan?: number;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
}

export function InfiniteScrollArea<T>({
  data,
  error,
  isFetching,
  isFetchingNextPage,
  fetchNextPage,
  className,
  hasNextPage,
  renderItem,
  estimateSize = () => 20,
  overscan = 5,
  loadingMessage = "Loading...",
  errorMessage = "Error occurred while fetching data",
  emptyMessage = "No data found",
}: InfiniteScrollAreaProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? data.length + 1 : data.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
  });

  React.useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= data.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    data.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  // Only show loading when we have no data AND are fetching
  if (isFetching && data.length === 0) {
    return (
      <div className="text-muted-foreground animate-in fade-in duration-300 px-4 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="ml-2">{loadingMessage}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive animate-in fade-in duration-300 px-4">
        {errorMessage}
      </div>
    );
  }

  // Show message when no data exists
  if (!isFetching && data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground animate-in fade-in duration-300 px-4">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)} ref={parentRef}>
      <div
        className="relative w-full flex flex-col gap-0.5"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > data.length - 1;
          const item = data[virtualRow.index];

          return (
            <div
              key={virtualRow.index}
              className="w-full h-full flex flex-col"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {isLoaderRow ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  {isFetchingNextPage
                    ? "Loading more..."
                    : hasNextPage
                      ? "Load more"
                      : "No more items"}
                </div>
              ) : (
                renderItem(item, virtualRow.index)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
