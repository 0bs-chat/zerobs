import { useSetAtom, useAtomValue } from "jotai";
import { memo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import type { RepoItem } from "@/hooks/github/types";
import {
  toggleFileSelectionAtom,
  toggleFolderSelectionAtom,
  selectedFilesAtom,
  selectedFoldersAtom,
  setSelectedFilesAtom,
  githubCombinedItemsAtom,
  tokenUsageAtom,
  maxTokensAtom,
} from "@/store/github";
import { toast } from "sonner";

interface TreeItemProps {
  item: RepoItem;
  children?: RepoItem[];
  allItems?: RepoItem[];
  getChildren?: (path: string) => RepoItem[];
}

export const TreeItem = memo(
  ({ item, children = [], allItems = [], getChildren }: TreeItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleFile = useSetAtom(toggleFileSelectionAtom);
    const toggleFolder = useSetAtom(toggleFolderSelectionAtom);
    const setSelectedFiles = useSetAtom(setSelectedFilesAtom);
    const selectedFiles = useAtomValue(selectedFilesAtom);
    const selectedFolders = useAtomValue(selectedFoldersAtom);
    const combinedItems = useAtomValue(githubCombinedItemsAtom);
    const currentTokenUsage = useAtomValue(tokenUsageAtom);
    const maxTokens = useAtomValue(maxTokensAtom);

    // Check if all files in folder are selected
    const areAllFilesInFolderSelected = (folderPath: string): boolean => {
      const filesInFolder = getFilesInFolder(folderPath);
      if (filesInFolder.length === 0) return false;
      return filesInFolder.every((filePath) => selectedFiles.has(filePath));
    };
    const isSelected =
      item.type === "file"
        ? selectedFiles.has(item.path)
        : selectedFolders.has(item.path);

    const depth = item.depth ?? 2;
    const indentationStyle = { paddingLeft: `${depth * 16 + 8}px` };

    // Check if this item would be blocked by token limit
    const wouldBeBlocked =
      !isSelected &&
      item.type === "file" &&
      typeof item.tokenCount === "number" &&
      item.tokenCount > 0 &&
      currentTokenUsage + item.tokenCount > maxTokens;

    // Format file size
    const formatSize = (size?: number) => {
      if (!size || item.type === "dir") return "";
      if (size < 1024) return `${size}B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
      return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    };

    // Get all files recursively under this folder
    const getFilesInFolder = (folderPath: string): string[] => {
      const files: string[] = [];
      for (const item of allItems) {
        if (item.type === "file" && item.path.startsWith(folderPath + "/")) {
          files.push(item.path);
        }
      }
      return files;
    };

    const handleFolderSelection = (folderPath: string) => {
      if (item.type === "dir") {
        const filesInFolder = getFilesInFolder(folderPath);
        if (filesInFolder.length > 0) {
          const currentSelected = Array.from(selectedFiles);

          if (isSelected) {
            // Always allow deselection
            const newSelected = currentSelected.filter(
              (filePath) => !filesInFolder.includes(filePath)
            );
            setSelectedFiles(newSelected);
            toggleFolder(item.path);
          } else {
            // Check if selecting all files in folder would exceed token limit
            let totalTokensForFolder = 0;
            for (const filePath of filesInFolder) {
              const fileItem = combinedItems.items.find(
                (item) => item.path === filePath && item.type === "file"
              );
              if (fileItem?.tokenCount) {
                totalTokensForFolder += fileItem.tokenCount;
              }
            }

            if (currentTokenUsage + totalTokensForFolder > maxTokens) {
              toast.error(
                "Token limit would be exceeded. Deselect some files first."
              );
              return;
            }

            const newSelected = [
              ...new Set([...currentSelected, ...filesInFolder]),
            ];
            setSelectedFiles(newSelected);
            toggleFolder(item.path);
          }
        } else {
          const success = toggleFolder(item.path);
          if (!success) {
            toast.error("Token limit reached. Deselect some files first.");
          }
        }
      }
    };

    const handleItemClick = () => {
      if (item.type === "file") {
        const success = toggleFile(item.path);

        if (!success) {
          toast.error("Token limit reached. Deselect some files first.");
        }
      } else {
        handleFolderSelection(item.path);
      }
    };

    const handleExpandClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    };

    const hasChildren = item.type === "dir" && children.length > 0;

    return (
      <div>
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
            wouldBeBlocked
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:bg-accent/30"
          } ${isSelected ? "bg-accent/50" : ""} ${
            wouldBeBlocked ? "cursor-not-allowed" : ""
          }`}
          style={indentationStyle}
          onClick={handleItemClick}
          title={wouldBeBlocked ? "Token limit would be exceeded" : undefined}
        >
          <div className="w-4 flex justify-center gap-1.5 items-center">
            {hasChildren ? (
              <button
                onClick={handleExpandClick}
                aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}
          </div>

          <Checkbox
            checked={
              isSelected ||
              (item.type === "dir" && areAllFilesInFolderSelected(item.path))
            }
            onCheckedChange={() => handleItemClick()}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${item.type} ${item.name}`}
            disabled={wouldBeBlocked}
          />

          {item.type === "file" ? (
            <File className="h-4 w-4 text-muted-foreground" />
          ) : (
            <>
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500" />
              )}
            </>
          )}

          <div className="flex-1 flex gap-2 items-center justify-between min-w-0">
            <span className="truncate text-sm" title={item.name}>
              {item.name}
            </span>
            <div className="flex items-center gap-2">
              {wouldBeBlocked && (
                <AlertTriangle className="h-3 w-3 text-destructive" />
              )}
              {item.tokenCount && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {item.tokenCount} tokens
                </Badge>
              )}
              {item.size && (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {formatSize(item.size)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col gap-1">
            {children.map((child) => (
              <TreeItem
                key={child.path}
                item={child}
                children={getChildren ? getChildren(child.path) : []}
                allItems={allItems}
                getChildren={getChildren}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
