import { useCallback, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitBranch, Github, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  loadRepository,
  fetchBranchesFromUrl,
  parseGitHubUrl,
  fetchFileContent,
  fetchDirectoryContents,
} from "@/lib/github";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TokenProgressBar } from "@/components/chat/input/github/token-progress-bar";
import {
  estimateTokens,
  wouldExceedLimit,
} from "@/components/chat/input/github/token-counter";
import { useStoreGitHubAsDocument } from "@/components/chat/input/github/gh-text";
import { TreeItem } from "@/components/chat/input/github/tree-item";
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

interface GitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

export const GitHubDialog = ({
  open,
  onOpenChange,
  children,
}: GitHubDialogProps) => {
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
    deselectItemRecursively,
    updateItemTokens,
    updateItemChildren,
    setItemLoading,
    setTotalTokens,
    getItemCounts,
    resetState,
  } = useGitHubStore();

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const storeGitHubAsDocument = useStoreGitHubAsDocument();

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resetState();
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = null;
        }
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, resetState]
  );

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

  // Handle item selection with recursive logic
  const handleToggleSelection = useCallback(
    async (path: string) => {
      const item = findItemInTree(items, path);
      if (!item) return;

      const isCurrentlySelected = selectedItems.includes(path);

      if (isCurrentlySelected) {
        // Deselect recursively
        deselectItemRecursively(path);

        // Calculate token reduction
        if (item.tokens) {
          setTotalTokens(Math.max(0, totalTokens - item.tokens));
        }
      } else {
        // For files, fetch content if needed
        if (item.type === "file") {
          try {
            const parsed = parseGitHubUrl(repoUrl);
            if (parsed && !item.content) {
              const result = await fetchFileContent({
                repoFullName: `${parsed.owner}/${parsed.repo}`,
                branch: branch.trim(),
                filePath: item.path,
              });

              if (result.success && result.content) {
                const tokens = estimateTokens(result.content);
                updateItemTokens(path, tokens);

                if (wouldExceedLimit(totalTokens, tokens)) {
                  toast.error(
                    `Cannot add ${item.name}. Would exceed token limit.`
                  );
                  return;
                }

                selectItemRecursively(path);
                setTotalTokens(totalTokens + tokens);
              }
            } else if (item.tokens) {
              if (wouldExceedLimit(totalTokens, item.tokens)) {
                toast.error(
                  `Cannot add ${item.name}. Would exceed token limit.`
                );
                return;
              }
              selectItemRecursively(path);
              setTotalTokens(totalTokens + item.tokens);
            } else {
              selectItemRecursively(path);
            }
          } catch (error) {
            console.error("Failed to fetch file content:", error);
            toast.error(`Failed to load content for ${item.name}`);
          }
        } else {
          // For directories, select recursively
          selectItemRecursively(path);
        }
      }
    },
    [
      items,
      selectedItems,
      findItemInTree,
      deselectItemRecursively,
      selectItemRecursively,
      updateItemTokens,
      setTotalTokens,
      totalTokens,
      repoUrl,
      branch,
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
        handleOpenChange(false); // Close the dialog
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Failed to store GitHub data:", error);
      toast.error("Failed to store GitHub repository data");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-[600px] z-50"
        aria-description="let's you add github repository to your chat"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Github className="w-5 h-5" />
            Add from GitHub
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 w-full flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end w-full">
            <div className="flex-1">
              <Label htmlFor="github-repo-input" className="mb-2 block">
                Repository
              </Label>
              <Input
                id="github-repo-input"
                value={repoUrl}
                onChange={(e) => handleRepoUrlChange(e.target.value)}
                placeholder="github.com/owner/repo or owner/repo"
                className="w-full"
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="w-48 min-w-[140px]">
              <Label htmlFor="github-branch-select" className="mb-2 block">
                Branch
                {loadingBranches && (
                  <Loader2 className="w-3 h-3 animate-spin inline ml-1" />
                )}
              </Label>
              <Select
                value={branch}
                onValueChange={setBranch}
                disabled={loading || loadingBranches || branches.length === 0}
              >
                <SelectTrigger id="github-branch-select" className="w-full">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branchName) => (
                    <SelectItem key={branchName} value={branchName}>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        <span className="truncate">{branchName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Enter a public GitHub repo URL or{" "}
            <span className="font-mono bg-muted px-1 rounded">owner/repo</span>{" "}
            format (e.g.{" "}
            <span className="font-mono bg-muted px-1 rounded">
              facebook/react
            </span>
            )
          </div>

          <Button
            onClick={handleLoadRepository}
            disabled={!repoUrl.trim() || loading || branches.length === 0}
            className="w-full"
            variant="secondary"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading Repository...
              </div>
            ) : (
              "Load Repository"
            )}
          </Button>

          {/* Repository Stats */}
          {loadSuccess && (
            <div className="text-sm text-muted-foreground">
              Repository contains {itemCounts.totalFiles} files and{" "}
              {itemCounts.totalFolders} folders
            </div>
          )}

          {/* Token Usage Progress Bar */}
          {loadSuccess && (
            <div className="space-y-2">
              <Label>Token Usage</Label>
              <TokenProgressBar usedTokens={totalTokens} />
            </div>
          )}

          {loadSuccess && items.length > 0 && (
            <div className="space-y-2">
              <Label>Select Items</Label>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-2">
                  {flattenedItems.map((item) => {
                    const isSelected = selectedItems.includes(item.path);
                    const isExpanded = expandedDirs.has(item.path);
                    const depth = item.depth || 0;

                    return (
                      <TreeItem
                        key={item.path}
                        item={item}
                        isSelected={isSelected}
                        isExpanded={isExpanded}
                        depth={depth}
                        onToggleSelection={handleToggleSelection}
                        onToggleExpansion={handleToggleExpansion}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Continue Button */}
          {loadSuccess && selectedItems.length > 0 && (
            <Button
              onClick={handleContinue}
              className="w-full"
              variant="default"
            >
              <Save className="w-4 h-4 mr-2" />
              Continue with {selectedItems.length} selected item
              {selectedItems.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
