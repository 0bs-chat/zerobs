import { memo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Folder, File, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "./token-counter";
import type { RepoItem } from "@/store/githubStore";

interface TreeItemProps {
  item: RepoItem;
  isSelected: boolean;
  isExpanded: boolean;
  depth: number;
  onToggleSelection: (path: string) => void;
  onToggleExpansion: (path: string, depth: number) => void;
}

export const TreeItem = memo(
  ({
    item,
    isSelected,
    isExpanded,
    depth,
    onToggleSelection,
    onToggleExpansion,
  }: TreeItemProps) => {
    const handleSelectionChange = useCallback(() => {
      onToggleSelection(item.path);
    }, [item.path, onToggleSelection]);

    const handleExpansionClick = useCallback(() => {
      if (item.type === "dir") {
        onToggleExpansion(item.path, depth);
      }
    }, [item.path, item.type, depth, onToggleExpansion]);

    return (
      <div
        className={cn(
          "flex items-center space-x-2 rounded-md border p-2 transition-colors",
          isSelected && "bg-accent/50"
        )}
        style={{ marginLeft: `${depth * 12}px` }}
      >
        <Checkbox
          id={item.path}
          checked={isSelected}
          onCheckedChange={handleSelectionChange}
          aria-label={`Select ${item.type} ${item.name}`}
        />

        <div className="flex-1 flex items-center justify-between">
          <div
            className="flex items-center gap-1 cursor-pointer hover:bg-accent/30 rounded px-1 py-0.5 transition-colors"
            onClick={handleExpansionClick}
          >
            {/* Expansion toggle for directories */}
            {item.type === "dir" && (
              <div className="p-1">
                {item.isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            )}
            {item.type === "file" && (
              <div className="w-5" /> /* Spacer for alignment */
            )}

            {item.type === "dir" ? (
              <Folder className="w-4 h-4 text-blue-500" />
            ) : (
              <File className="w-4 h-4 text-gray-500" />
            )}

            <span className="text-sm font-medium truncate">{item.name}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.tokens && <span>{formatTokenCount(item.tokens)} tokens</span>}
            {item.size && <span>{(item.size / 1024).toFixed(1)}KB</span>}
          </div>
        </div>
      </div>
    );
  }
);

TreeItem.displayName = "TreeItem";
