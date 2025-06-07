import { useCallback, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  loadRepository,
  fetchBranchesFromUrl,
  parseGitHubUrl,
  fetchFileContent,
  fetchDirectoryContents,
} from "@/lib/github";
import {
  estimateTokens,
  wouldExceedLimit,
} from "@/components/chat/input/github/token-counter";
import { useStoreGitHubAsDocument } from "@/components/chat/input/github/gh-text";
import {
  useRepoUrl,
  useBranch,
  useBranches,
  useItems,
  useSelectedItems,
  useLoading,
  useLoadingBranches,
  useLoadSuccess,
  useExpandedDirs,
  useTotalTokens,
  useGitHubStore,
  type RepoItem,
} from "@/store/githubStore";

export const useGitHub = () => {
  // Store hooks
  const repoUrl = useRepoUrl();
  const branch = useBranch();
  const branches = useBranches();
  const items = useItems();
  const selectedItems = useSelectedItems();
  const loading = useLoading();
  const loadingBranches = useLoadingBranches();
  const loadSuccess = useLoadSuccess();
  const expandedDirs = useExpandedDirs();
  const totalTokens = useTotalTokens();

  // Get store actions
  const {
    setBranches,
    setBranch,
    setLoadingBranches,
    setRepoUrl,
    setItems,
    setSelectedItems,
    setLoading,
    setLoadSuccess,
    toggleExpandedDir,
    selectItemRecursively,
    updateItemTokens,
    updateItemChildren,
    setItemLoading,
    setTotalTokens,
    getItemCounts,
    resetState,
    selectItemWithTokens,
    deselectItemWithTokens,
  } = useGitHubStore();

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const storeGitHubAsDocument = useStoreGitHubAsDocument();

  // Debounced function to fetch branches
  const debouncedFetchBranches = useCallback(
    (url: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        const parsed = parseGitHubUrl(url);
        if (!parsed) {
          setBranches([]);
          return;
        }

        try {
          setLoadingBranches(true);
          const branchNames = await fetchBranchesFromUrl(url);
          setBranches(branchNames);
          if (branchNames.length > 0 && !branchNames.includes(branch)) {
            setBranch(branchNames[0]);
          }
        } catch (error) {
          console.error("Failed to fetch branches:", error);
          setBranches([]);
        } finally {
          setLoadingBranches(false);
        }
      }, 500);
    },
    [branch, setBranches, setBranch, setLoadingBranches]
  );

  const handleRepoUrlChange = useCallback(
    (value: string) => {
      setRepoUrl(value);

      if (value.trim()) {
        debouncedFetchBranches(value.trim());
      } else {
        setBranches([]);
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = null;
        }
      }
    },
    [debouncedFetchBranches, setRepoUrl, setBranches]
  );

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Function to calculate tokens incrementally for all files
  const calculateTokensIncrementally = useCallback(
    async (itemsToProcess: RepoItem[]) => {
      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) return;

      const getAllFiles = (items: RepoItem[]): RepoItem[] => {
        let files: RepoItem[] = [];
        for (const item of items) {
          if (item.type === "file") {
            files.push(item);
          }
          if (item.children) {
            files = files.concat(getAllFiles(item.children));
          }
        }
        return files;
      };

      const allFiles = getAllFiles(itemsToProcess);
      toast.info(`Calculating tokens for ${allFiles.length} files...`);

      let processedCount = 0;
      for (const file of allFiles) {
        if (!file.tokens) {
          try {
            const result = await fetchFileContent({
              repoFullName: `${parsed.owner}/${parsed.repo}`,
              branch: branch.trim(),
              filePath: file.path,
            });

            if (result.success && result.content) {
              const tokens = estimateTokens(result.content);
              updateItemTokens(file.path, tokens);
              processedCount++;

              // Update progress
              if (
                processedCount % 5 === 0 ||
                processedCount === allFiles.length
              ) {
                toast.info(
                  `Processed ${processedCount}/${allFiles.length} files...`
                );
              }
            }
          } catch (error) {
            console.error(
              `Failed to calculate tokens for ${file.path}:`,
              error
            );
          }
        }
      }

      toast.success(
        `Token calculation complete! Processed ${allFiles.length} files.`
      );
    },
    [repoUrl, branch, updateItemTokens]
  );

  const handleLoadRepository = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a GitHub repository URL.");
      return;
    }
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      toast.error(
        "Invalid GitHub URL format. Please enter a valid GitHub repository URL."
      );
      return;
    }
    if (!branch.trim()) {
      toast.error("Please enter a branch name.");
      return;
    }
    try {
      setLoading(true);
      setItems([]);
      setSelectedItems([]);
      setTotalTokens(0);
      setLoadSuccess(false);
      toast.info(
        `Loading repository "${parsed.owner}/${parsed.repo}" from branch "${branch}"...`
      );
      const result = await loadRepository({
        repoFullName: `${parsed.owner}/${parsed.repo}`,
        branch: branch.trim(),
      });
      if (result.success && result.contents) {
        const itemsWithDepth = result.contents.map((item) => ({
          ...item,
          depth: 0,
          childrenLoaded: false,
        }));
        setItems(itemsWithDepth);
        setLoadSuccess(true);
        if (result.contents.length === 0) {
          toast.warning("No items found in the root of this repository.");
        } else {
          toast.success(result.message);
          // Calculate tokens only for files in the root directory
          const rootFiles = itemsWithDepth.filter(
            (item) => item.type === "file"
          );
          if (rootFiles.length > 0) {
            calculateTokensIncrementally(rootFiles);
          }
        }
      } else {
        setItems([]);
        setLoadSuccess(false);
        toast.error(result.message);
      }
    } catch (error) {
      setItems([]);
      setLoadSuccess(false);
      console.error("Error loading repository:", error);
      toast.error("Failed to load repository");
    } finally {
      setLoading(false);
    }
  };

  // Utility function to find item in tree
  const findItemInTree = useCallback(
    (items: RepoItem[], path: string): RepoItem | null => {
      for (const item of items) {
        if (item.path === path) return item;
        if (item.children) {
          const found = findItemInTree(item.children, path);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  // Recalculate total tokens whenever selected items change to ensure accuracy
  useEffect(() => {
    let calculatedTokens = 0;
    for (const selectedPath of selectedItems) {
      const item = findItemInTree(items, selectedPath);
      if (item && item.type === "file" && item.tokens) {
        calculatedTokens += item.tokens;
      }
    }
    if (calculatedTokens !== totalTokens) {
      setTotalTokens(calculatedTokens);
    }
  }, [selectedItems, items, totalTokens, setTotalTokens, findItemInTree]);

  // Memoized flattened items for rendering
  const flattenedItems = useMemo(() => {
    const result: RepoItem[] = [];
    const addItems = (itemList: RepoItem[]) => {
      for (const item of itemList) {
        result.push(item);
        if (item.expanded && item.children) {
          addItems(item.children);
        }
      }
    };
    addItems(items);
    return result;
  }, [items]);

  // Handle item selection with pre-calculated tokens
  const handleToggleSelection = useCallback(
    (path: string) => {
      const item = findItemInTree(items, path);
      if (!item) return;

      const isCurrentlySelected = selectedItems.includes(path);

      if (isCurrentlySelected) {
        // Deselect recursively and update tokens
        const removedTokens = deselectItemWithTokens(path);
        setTotalTokens(Math.max(0, totalTokens - removedTokens));
      } else {
        // Use pre-calculated tokens for selection
        const addedTokens = selectItemWithTokens(path);

        if (addedTokens > 0 && wouldExceedLimit(totalTokens, addedTokens)) {
          toast.error(
            `Cannot add ${item.name}. Would exceed token limit (${addedTokens} tokens).`
          );
          return;
        }

        setTotalTokens(totalTokens + addedTokens);

        if (addedTokens > 0) {
          toast.success(`Added ${item.name} with ${addedTokens} tokens.`);
        } else {
          toast.success(`Added ${item.name}.`);
        }
      }
    },
    [
      items,
      selectedItems,
      findItemInTree,
      selectItemWithTokens,
      deselectItemWithTokens,
      setTotalTokens,
      totalTokens,
    ]
  );

  // Handle directory expansion
  const handleToggleExpansion = useCallback(
    async (dirPath: string, depth: number) => {
      const item = findItemInTree(items, dirPath);
      if (!item || item.type !== "dir") return;

      if (expandedDirs.has(dirPath)) {
        // Just collapse
        toggleExpandedDir(dirPath);
      } else {
        // Expand and load children if not already loaded
        if (!item.childrenLoaded) {
          try {
            setItemLoading(dirPath, true);
            const parsed = parseGitHubUrl(repoUrl);
            if (!parsed) return;

            const result = await fetchDirectoryContents({
              repoFullName: `${parsed.owner}/${parsed.repo}`,
              branch: branch.trim(),
              dirPath,
            });

            if (result.success && result.contents) {
              const childrenWithDepth = result.contents.map((child) => ({
                ...child,
                depth: depth + 1,
                childrenLoaded: false,
              }));

              updateItemChildren(dirPath, childrenWithDepth);
              toggleExpandedDir(dirPath);

              // Calculate tokens only for files in this directory
              const newFiles = childrenWithDepth.filter(
                (item) => item.type === "file"
              );
              if (newFiles.length > 0) {
                calculateTokensIncrementally(newFiles);
              }
            }
          } catch (error) {
            console.error("Failed to fetch directory contents:", error);
            toast.error(`Failed to load directory ${dirPath}`);
          } finally {
            setItemLoading(dirPath, false);
          }
        } else {
          // Just expand
          toggleExpandedDir(dirPath);
        }
      }
    },
    [
      items,
      expandedDirs,
      findItemInTree,
      toggleExpandedDir,
      setItemLoading,
      updateItemChildren,
      calculateTokensIncrementally,
      repoUrl,
      branch,
    ]
  );

  // Memoized item counts
  const itemCounts = useMemo(() => {
    return getItemCounts();
  }, [getItemCounts]);

  const handleContinue = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one file or folder to continue.");
      return;
    }

    try {
      const result = await storeGitHubAsDocument(
        repoUrl,
        branch,
        selectedItems,
        items
      );

      if (result.success) {
        toast.success(result.message);
        return { success: true };
      } else {
        toast.error(result.error);
        return { success: false };
      }
    } catch (error) {
      console.error("Failed to store GitHub data:", error);
      toast.error("Failed to store GitHub repository data");
      return { success: false };
    }
  };

  const handleSelectAllFiles = async () => {
    const allFiles = flattenedItems.filter((item) => item.type === "file");
    const selectedFiles = selectedItems.filter((path) => {
      const item = findItemInTree(items, path);
      return item?.type === "file";
    });

    if (selectedFiles.length === allFiles.length) {
      // Deselect all files
      setSelectedItems([]);
      setTotalTokens(0);
    } else {
      // Select all files with limit checking
      const filesWithoutTokens = allFiles.filter((item) => !item.tokens);

      // If there are files without tokens, calculate them first
      if (filesWithoutTokens.length > 0) {
        toast.info(
          `Calculating tokens for ${filesWithoutTokens.length} files before selection...`
        );
        await calculateTokensIncrementally(filesWithoutTokens);
      }

      // Now select all files respecting token limits
      let totalFileTokens = 0;
      const itemsToSelect: string[] = [];

      for (const item of allFiles) {
        if (item.tokens) {
          if (!wouldExceedLimit(totalFileTokens, item.tokens)) {
            totalFileTokens += item.tokens;
            itemsToSelect.push(item.path);
          } else {
            // Stop adding more files if we would exceed limit
            break;
          }
        } else {
          // Include files without tokens (edge case)
          itemsToSelect.push(item.path);
        }
      }

      setSelectedItems(itemsToSelect);
      setTotalTokens(totalFileTokens);

      if (itemsToSelect.length < allFiles.length) {
        toast.warning(
          `Selected ${itemsToSelect.length}/${allFiles.length} files. Some excluded due to token limit.`
        );
      } else {
        toast.success(`Selected all ${itemsToSelect.length} files.`);
      }
    }
  };

  const isAllFilesSelected = useMemo(() => {
    const allFiles = flattenedItems.filter((item) => item.type === "file");
    const selectedFiles = selectedItems.filter((path) => {
      const item = findItemInTree(items, path);
      return item?.type === "file";
    });
    return selectedFiles.length === allFiles.length;
  }, [flattenedItems, selectedItems, findItemInTree, items]);

  const handleDialogClose = useCallback(() => {
    resetState();
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, [resetState]);

  return {
    // State
    repoUrl,
    branch,
    branches,
    items,
    selectedItems,
    loading,
    loadingBranches,
    loadSuccess,
    expandedDirs,
    totalTokens,
    flattenedItems,
    itemCounts,
    isAllFilesSelected,

    // Actions
    handleRepoUrlChange,
    setBranch,
    handleLoadRepository,
    handleToggleSelection,
    handleToggleExpansion,
    handleContinue,
    handleSelectAllFiles,
    handleDialogClose,
    findItemInTree,
  };
};
