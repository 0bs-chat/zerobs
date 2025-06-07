import { memo, useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Folder, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "./token-counter";
import type { RepoItem } from "@/store/githubStore";

interface TreeItemProps {
  item: RepoItem;
  isSelected: boolean;
  isExpanded: boolean;
  depth: number;
  selectedItems: string[]; // Add this to calculate folder selection state
  onToggleSelection: (path: string) => void;
  onToggleExpansion: (path: string, depth: number) => void;
}

export const TreeItem = memo(
  ({
    item,
    isSelected,
    depth,
    selectedItems,
    onToggleSelection,
    onToggleExpansion,
  }: TreeItemProps) => {
    // Calculate folder selection state and total tokens
    const folderState = useMemo(() => {
      if (item.type === "file") {
        return {
          selectionState: "none" as const,
          totalTokens: item.tokens || 0,
          totalFiles: 0,
          selectedFiles: 0,
        };
      }

      const getAllFilesInFolder = (folderItem: RepoItem): RepoItem[] => {
        let files: RepoItem[] = [];
        if (folderItem.children) {
          for (const child of folderItem.children) {
            if (child.type === "file") {
              files.push(child);
            } else {
              files = files.concat(getAllFilesInFolder(child));
            }
          }
        }
        return files;
      };

      const allFiles = getAllFilesInFolder(item);
      const selectedFiles = allFiles.filter((file) =>
        selectedItems.includes(file.path)
      );
      const totalTokens = allFiles.reduce(
        (sum, file) => sum + (file.tokens || 0),
        0
      );

      let selectionState: "none" | "partial" | "all" = "none";
      if (selectedFiles.length === 0) {
        selectionState = "none";
      } else if (
        selectedFiles.length === allFiles.length &&
        allFiles.length > 0
      ) {
        selectionState = "all";
      } else {
        selectionState = "partial";
      }

      return {
        selectionState,
        totalTokens,
        totalFiles: allFiles.length,
        selectedFiles: selectedFiles.length,
      };
    }, [item, selectedItems]);

    const handleSelectionChange = useCallback(() => {
      if (item.type === "file") {
        onToggleSelection(item.path);
      }
      // For folders, do nothing - they can't be selected directly
    }, [item.path, item.type, onToggleSelection]);

    const handleExpansionClick = useCallback(() => {
      if (item.type === "dir") {
        onToggleExpansion(item.path, depth);
      }
    }, [item.path, item.type, depth, onToggleExpansion]);

    return (
      <div
        className={cn(
          "flex items-center space-x-2 rounded-md border p-2 transition-colors",
          item.type === "file" && isSelected && "bg-accent/50",
          item.type === "dir" &&
            folderState.selectionState === "partial" &&
            "bg-accent/20",
          item.type === "dir" &&
            folderState.selectionState === "all" &&
            "bg-accent/40"
        )}
        style={{ marginLeft: `${depth * 12}px` }}
      >
        <Checkbox
          id={item.path}
          checked={
            item.type === "file"
              ? isSelected
              : folderState.selectionState === "all"
          }
          ref={
            item.type === "dir" && folderState.selectionState === "partial"
              ? (el) => {
                  if (el) {
                    const checkbox = el.querySelector(
                      'input[type="checkbox"]'
                    ) as HTMLInputElement;
                    if (checkbox) checkbox.indeterminate = true;
                  }
                }
              : undefined
          }
          onCheckedChange={handleSelectionChange}
          disabled={item.type === "dir"}
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
                {item.isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
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
            {item.type === "file" && !item.tokens && (
              <div className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            )}
            {item.type === "file" && item.tokens && (
              <span>{formatTokenCount(item.tokens)} tokens</span>
            )}
            {item.type === "dir" && folderState.totalTokens > 0 && (
              <span>{formatTokenCount(folderState.totalTokens)} tokens</span>
            )}
            {item.type === "dir" && folderState.totalFiles > 0 && (
              <span>
                ({folderState.selectedFiles}/{folderState.totalFiles} files)
              </span>
            )}
            {item.type === "file" && item.size && (
              <span>{(item.size / 1024).toFixed(1)}KB</span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

TreeItem.displayName = "TreeItem";
