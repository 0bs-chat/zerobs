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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TokenProgressBar } from "@/components/chat/input/github/token-progress-bar";
import { TreeItem } from "@/components/chat/input/github/tree-item";
import { useGitHub } from "@/hooks/use-github";
import { useEffect } from "react";

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
  const {
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
  } = useGitHub();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleDialogClose();
      onOpenChange(newOpen);
    }
    onOpenChange(newOpen);
  };

  const handleContinueAndClose = async () => {
    const result = await handleContinue();
    if (result?.success) {
      handleDialogClose();
      handleOpenChange(false);
    }
  };

  useEffect(() => {
    if (!open) {
      handleDialogClose();
    }
  }, [handleDialogClose, open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={`sm:max-w-[800px] z-[60]`}
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
            <div className="flex-1 ">
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

          <Button
            onClick={handleLoadRepository}
            disabled={!repoUrl.trim() || loading || branches.length === 0}
            className="w-full"
            variant="outline"
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
          {loadSuccess && items.length > 0 && !loading && (
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
              <div className="flex items-center justify-between">
                <Label>Select Items</Label>
                <Button
                  size="sm"
                  variant={isAllFilesSelected ? "default" : "outline"}
                  onClick={handleSelectAllFiles}
                  className="text-xs"
                >
                  {isAllFilesSelected ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-2 ">
                  {flattenedItems.map((item) => {
                    const isSelected = selectedItems.includes(item.path);
                    const isExpanded = expandedDirs.has(item.path);
                    const depth = item.depth || 0;
                    return (
                      <div
                        key={item.path}
                        className="cursor-pointer w-full"
                        onClick={() => {
                          if (item.type === "dir") {
                            handleToggleExpansion(item.path, depth);
                          } else {
                            handleToggleSelection(item.path);
                          }
                        }}
                      >
                        <TreeItem
                          item={item}
                          isSelected={isSelected}
                          isExpanded={isExpanded}
                          depth={depth}
                          selectedItems={selectedItems}
                          onToggleSelection={handleToggleSelection}
                          onToggleExpansion={handleToggleExpansion}
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={handleContinueAndClose}
            className="w-full"
            disabled={selectedItems.length === 0}
            variant="default"
          >
            <Save className="w-4 h-4 mr-2" />
            Continue with {selectedItems.length} selected item
            {selectedItems.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
