import { memo } from "react";
import type { MessageWithBranchInfo } from "../../../../../convex/chatMessages/helpers";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export { type MessageWithBranchInfo };

export type BranchDirection = "prev" | "next";

export interface MessageBranchNavigation {
  (depth: number, direction: BranchDirection, totalBranches: number): void;
}

export interface BranchNavigationProps {
  item: MessageWithBranchInfo;
  navigateBranch: MessageBranchNavigation;
}

export const BranchNavigation = memo(
  ({ item, navigateBranch }: BranchNavigationProps) => {
    if (item.totalBranches <= 1) {
      return null;
    }

    return (
      <div className="flex items-center gap-.5 text-xs text-muted-foreground">
        <Button
          onClick={() => navigateBranch(item.depth, "prev", item.totalBranches)}
          variant="ghost"
          size="icon"
          aria-label="Previous branch"
          className="h-6 w-6"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>
          {item.branchIndex} / {item.totalBranches}
        </span>
        <Button
          onClick={() => navigateBranch(item.depth, "next", item.totalBranches)}
          variant="ghost"
          size="icon"
          aria-label="Next branch"
          className="h-6 w-6"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  },
);

BranchNavigation.displayName = "BranchNavigation";
