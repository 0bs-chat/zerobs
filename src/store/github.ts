import { atom } from "jotai";
import type { GitHubCombinedItems } from "@/hooks/github/types";

// Main data atom that the UI consumes

// Loading and error states
export const githubIsLoadingAtom = atom<boolean>(false);
export const githubHasErrorAtom = atom<boolean>(false);
export const githubErrorMessageAtom = atom<string | null>(null);

// Current repository info
export const githubCurrentRepoAtom = atom<string>("");
export const githubCurrentBranchAtom = atom<string>("main");

// File selection state
export const selectedFilesAtom = atom<Set<string>>(new Set<string>());
export const selectedFoldersAtom = atom<Set<string>>(new Set<string>());

export const githubCombinedItemsAtom = atom<GitHubCombinedItems>({
  items: [],
  isUsingFullDepth: false,
  isLoadingFullDepth: false,
  stats: null,
});

// Token usage atoms
export const maxTokensAtom = atom<number>(32000);

// Derived atom that calculates current token usage from selected files
export const tokenUsageAtom = atom((get) => {
  const selectedFiles = get(selectedFilesAtom);
  const combinedItems = get(githubCombinedItemsAtom);

  let totalTokens = 0;
  for (const filePath of selectedFiles) {
    const item = combinedItems.items.find(
      (item) => item.path === filePath && item.type === "file"
    );
    if (item?.tokenCount) {
      totalTokens += item.tokenCount;
    }
  }

  return totalTokens;
});

// Derived atom for token usage percentage
export const tokenUsagePercentageAtom = atom((get) => {
  const usage = get(tokenUsageAtom);
  const max = get(maxTokensAtom);
  return Math.min((usage / max) * 100, 100);
});

// Derived atom to check if at token limit
export const isAtTokenLimitAtom = atom((get) => {
  const usage = get(tokenUsageAtom);
  const max = get(maxTokensAtom);
  return usage >= max;
});

// Derived atom to check if adding a specific file would exceed limit
export const wouldExceedLimitAtom = atom(
  null,
  (get, _set, filePath: string) => {
    const currentUsage = get(tokenUsageAtom);
    const maxTokens = get(maxTokensAtom);
    const combinedItems = get(githubCombinedItemsAtom);

    const item = combinedItems.items.find(
      (item) => item.path === filePath && item.type === "file"
    );
    const fileTokens = item?.tokenCount || 0;

    return currentUsage + fileTokens > maxTokens;
  }
);

// Derived atoms for selection management
export const totalSelectedCountAtom = atom((get) => {
  const selectedFiles = get(selectedFilesAtom);
  const selectedFolders = get(selectedFoldersAtom);
  return selectedFiles.size + selectedFolders.size;
});

// Actions for file selection with token limit checking
export const toggleFileSelectionAtom = atom(
  null,
  (get, set, filePath: string) => {
    const currentSelected = get(selectedFilesAtom);
    const newSelected = new Set(currentSelected);

    if (newSelected.has(filePath)) {
      // Always allow deselection
      newSelected.delete(filePath);
      set(selectedFilesAtom, newSelected);
      return true;
    } else {
      // Check if adding this file would exceed the limit
      const combinedItems = get(githubCombinedItemsAtom);
      const item = combinedItems.items.find(
        (item) => item.path === filePath && item.type === "file"
      );
      const fileTokens = item?.tokenCount || 0;
      const currentUsage = get(tokenUsageAtom);
      const maxTokens = get(maxTokensAtom);

      if (currentUsage + fileTokens > maxTokens) {
        return false; // Indicate selection was blocked
      }

      newSelected.add(filePath);
      set(selectedFilesAtom, newSelected);
      return true;
    }
  }
);

export const toggleFolderSelectionAtom = atom(
  null,
  (get, set, folderPath: string) => {
    const currentSelected = get(selectedFoldersAtom);
    const newSelected = new Set(currentSelected);
    const isAtLimit = get(isAtTokenLimitAtom);

    if (newSelected.has(folderPath)) {
      // Always allow deselection
      newSelected.delete(folderPath);
      set(selectedFoldersAtom, newSelected);
      return true;
    } else {
      // Check if we can add more folders
      if (isAtLimit) {
        return false; // Indicate selection was blocked
      }

      newSelected.add(folderPath);
      set(selectedFoldersAtom, newSelected);
      return true;
    }
  }
);

export const setSelectedFilesAtom = atom(
  null,
  (_get, set, filePaths: string[]) => {
    set(selectedFilesAtom, new Set(filePaths));
  }
);

export const selectAllFilesAtom = atom(
  null,
  (get, set, filePaths: string[], folderPaths: string[]) => {
    // Calculate total tokens for all files
    const combinedItems = get(githubCombinedItemsAtom);
    const maxTokens = get(maxTokensAtom);

    let totalTokens = 0;
    for (const filePath of filePaths) {
      const item = combinedItems.items.find(
        (item) => item.path === filePath && item.type === "file"
      );
      if (item?.tokenCount) {
        totalTokens += item.tokenCount;
      }
    }

    if (totalTokens > maxTokens) {
      return false; // Don't allow select all if it would exceed limit
    }

    set(selectedFilesAtom, new Set(filePaths));
    set(selectedFoldersAtom, new Set(folderPaths));
    return true;
  }
);

export const clearAllSelectionsAtom = atom(null, (_get, set) => {
  set(selectedFilesAtom, new Set());
  set(selectedFoldersAtom, new Set());
});
