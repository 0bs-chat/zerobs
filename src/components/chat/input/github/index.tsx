import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedCallback } from "use-debounce";
import FileTree from "./file-tree";
import { Button } from "@/components/ui/button";
import useGithub from "@/hooks/github/use-github";
import { toast } from "sonner";
import TokenUsageCounter from "./token-usage";
import {
  selectedFilesAtom,
  githubCurrentRepoAtom,
  githubCurrentBranchAtom,
  githubAvailableBranchesAtom,
} from "@/store/github";
import { useUploadDocuments } from "@/hooks/use-documents";
import { useAtom, useAtomValue } from "jotai";

interface GitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

const RepoLoader = () => {
  const { loadRepository, parseGitHubUrl, getRepoBranches } = useGithub();
  const [currentRepo, setCurrentRepo] = useAtom(githubCurrentRepoAtom);
  const [currentBranch, setCurrentBranch] = useAtom(githubCurrentBranchAtom);
  const [availableBranches, setAvailableBranches] = useAtom(
    githubAvailableBranchesAtom
  );
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const handleRepoUrlChange = useDebouncedCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value.trim();
      setCurrentRepo(url);

      if (url) {
        const parsed = parseGitHubUrl(url);
        if (parsed) {
          setIsLoadingBranches(true);
          try {
            const branches = await getRepoBranches(url);
            setAvailableBranches(branches);

            // Set default branch if current branch is not available
            if (!branches.includes(currentBranch)) {
              const defaultBranch = branches.includes("main")
                ? "main"
                : branches[0];
              setCurrentBranch(defaultBranch);
            }
          } catch (error) {
            console.error("Error fetching branches:", error);
            toast.error("Failed to fetch branches");
            setAvailableBranches(["main"]);
            setCurrentBranch("main");
          } finally {
            setIsLoadingBranches(false);
          }
        } else {
          // Invalid URL format
          setAvailableBranches(["main"]);
          setCurrentBranch("main");
          if (url) {
            toast.error("Invalid GitHub URL format", {
              description:
                "Use formats like: github.com/owner/repo or owner/repo",
            });
          }
        }
      } else {
        // Empty URL
        setAvailableBranches(["main"]);
        setCurrentBranch("main");
      }
    },
    500
  );

  const handleBranchChange = (value: string) => {
    setCurrentBranch(value);
  };

  const isValidRepo = currentRepo && parseGitHubUrl(currentRepo);
  const canLoadRepository = isValidRepo && currentBranch && !isLoadingBranches;

  return (
    <div className="flex gap-4 w-full items-center justify-between">
      <Input
        placeholder="(owner/repo) or https://github.com/owner/repo"
        className="w-full"
        defaultValue={currentRepo}
        onChange={handleRepoUrlChange}
      />

      <div className="flex flex-col">
        <Select
          disabled={!isValidRepo || isLoadingBranches}
          value={currentBranch}
          onValueChange={handleBranchChange}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={isLoadingBranches ? "Loading..." : "Select branch"}
            />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] overflow-y-auto">
            {isLoadingBranches ? (
              <SelectItem value={currentBranch} disabled>
                Loading...
              </SelectItem>
            ) : (
              availableBranches.map((branch: string) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        onClick={() => {
          const parsed = parseGitHubUrl(currentRepo);
          if (parsed && currentBranch) {
            let urlWithBranch = currentRepo;
            if (!parsed.branch && currentBranch !== "main") {
              if (currentRepo.includes("github.com")) {
                urlWithBranch = `${currentRepo}/tree/${currentBranch}`;
              } else {
                urlWithBranch = `https://github.com/${currentRepo}/tree/${currentBranch}`;
              }
            }
            loadRepository(urlWithBranch);
          }
        }}
        disabled={!canLoadRepository}
      >
        Load Repository
      </Button>
    </div>
  );
};

function RepoActions() {
  const uploadDocuments = useUploadDocuments({ type: "text" });
  const { combineSelectedFilesForChat } = useGithub();
  const selectedFiles = useAtomValue(selectedFilesAtom);

  const handleAddToChat = async () => {
    try {
      // Generate combined file
      const combinedFile = await combineSelectedFilesForChat(
        Array.from(selectedFiles)
      );

      // Create FileList
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(combinedFile);
      const fileList = dataTransfer.files;

      // Upload using existing hook
      await uploadDocuments(fileList);

      toast.success(
        `Added ${selectedFiles.size} files to chat as combined document`
      );
    } catch (error) {
      console.error("Error adding files to chat:", error);
      toast.error("Failed to add files to chat");
    }
  };

  return (
    <div className="flex gap-2 w-full items-center justify-between">
      <TokenUsageCounter />
      <Button onClick={handleAddToChat} disabled={!selectedFiles.size}>
        Add to Chat
      </Button>
    </div>
  );
}

export const GitHubDialog = ({
  open,
  onOpenChange,
  children,
}: GitHubDialogProps) => {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={`sm:max-w-[800px]`}
        aria-description="let's you add github repository to your chat"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <p>Add from GitHub</p>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 w-full flex flex-col gap-4">
          <RepoLoader />
          <FileTree />
          <RepoActions />
        </div>
      </DialogContent>
    </Dialog>
  );
};
