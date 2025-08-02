import { TreeItem } from "./tree-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  githubCombinedItemsAtom,
  githubIsLoadingAtom,
  githubHasErrorAtom,
  totalSelectedCountAtom,
  selectAllFilesAtom,
  clearAllSelectionsAtom,
  isAtTokenLimitAtom,
} from "@/store/github";
import type { RepoItem } from "@/hooks/chats/github/types";
import { toast } from "sonner";
import { useMemo } from "react";

const FileTree = () => {
  const { items, stats } = useAtomValue(githubCombinedItemsAtom);
  const isLoading = useAtomValue(githubIsLoadingAtom);
  const hasError = useAtomValue(githubHasErrorAtom);
  const totalSelectedCount = useAtomValue(totalSelectedCountAtom);
  const isAtLimit = useAtomValue(isAtTokenLimitAtom);
  const clearAllSelections = useSetAtom(clearAllSelectionsAtom);
  const selectAllFiles = useSetAtom(selectAllFilesAtom);

  const handleSelectAll = () => {
    if (totalSelectedCount > 0) {
      // Always allow clearing selections
      clearAllSelections();
    } else {
      // Check token limit before selecting all
      if (isAtLimit) {
        toast.error("Token limit reached. Cannot select all files.");
        return;
      }

      const allFilePaths = items
        .filter((item) => item.type === "file")
        .map((item) => item.path);
      const allFolderPaths = items
        .filter((item) => item.type === "dir")
        .map((item) => item.path);

      const success = selectAllFiles(allFilePaths, allFolderPaths);
      if (!success) {
        toast.error("Token limit reached. Cannot select all files.");
      }
    }
  };

  // Organize items into a proper tree structure
  const organizeItemsHierarchically = (items: RepoItem[]) => {
    const itemsMap = new Map<string, RepoItem>();
    const childrenMap = new Map<string, RepoItem[]>();
    const rootItems: RepoItem[] = [];

    // Build items map for quick lookup
    for (const item of items) {
      itemsMap.set(item.path, item);
    }

    // Build tree structure
    for (const item of items) {
      const pathParts = item.path.split("/");

      if (pathParts.length === 1) {
        // This is a root level item
        rootItems.push(item);
      } else {
        // This is a nested item - add it to its parent's children
        const parentPath = pathParts.slice(0, -1).join("/");

        // Only add to children map if parent exists in our items
        if (itemsMap.has(parentPath)) {
          if (!childrenMap.has(parentPath)) {
            childrenMap.set(parentPath, []);
          }
          childrenMap.get(parentPath)!.push(item);
        } else {
          // Parent doesn't exist in our items, treat as root item
          rootItems.push(item);
        }
      }
    }

    return {
      rootItems,
      getChildren: (path: string) => childrenMap.get(path) || [],
    };
  };

  const { rootItems, getChildren } = useMemo(
    () => organizeItemsHierarchically(items),
    [items],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Loading repository...</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Error loading repository. Please try again.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No files found in repository.</p>
      </div>
    );
  }

  return (
    <div className="w-full border-b">
      <div className="flex items-center justify-between p-2 border-b">
        <Label className="text-sm font-medium">
          Repository Files {stats && `(${stats.totalFiles} files)`}
        </Label>
        <Button
          onClick={handleSelectAll}
          variant="outline"
          size="sm"
          disabled={isAtLimit && totalSelectedCount === 0}
          className="text-xs"
        >
          {totalSelectedCount > 0 ? "Clear All" : "Select All"}
        </Button>
      </div>

      <ScrollArea className="h-96 w-full">
        <div className="p-2 flex gap-1 flex-col">
          {rootItems.map((item) => (
            <TreeItem
              key={item.path}
              item={item}
              children={getChildren(item.path)}
              allItems={items}
              getChildren={getChildren}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FileTree;
