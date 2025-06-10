import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMemo } from "react";
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
// import { TokenProgressBar } from "@/components/chat/input/github/token-progress-bar";
import useGithub from "@/hooks/github/use-github";
import { toast } from "sonner";
import TokenUsageCounter from "./token-usage";
import { selectedFilesAtom } from "@/store/github";
import { useUploadDocuments } from "@/hooks/use-documents";
import { useAtomValue } from "jotai";

interface GitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

const RepoLoader = ({ branch }: { branch: string }) => {
  const { loadRepository, parseGitHubUrl, currentRepo } = useGithub();

  const handleRepoUrlChange = useDebouncedCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value.trim();

      if (url) {
        const parsed = parseGitHubUrl(url);
        if (parsed) {
          await loadRepository(url, branch);
        } else {
          toast.error("Invalid GitHub URL format", {
            description: "Please enter a valid GitHub repository URL",
          });
        }
      }
    },
    500
  );

  const handleBranchChange = (value: string) => {
    if (currentRepo) {
      loadRepository(currentRepo, value);
    }
  };

  return (
    <div className="flex gap-4 w-full items-center justify-between">
      <Input
        placeholder="Enter GitHub repository URL"
        className="w-full"
        defaultValue={currentRepo ?? ""}
        onChange={handleRepoUrlChange}
      />
      <div className="flex flex-col gap-2">
        <Select
          disabled={!currentRepo}
          value={branch}
          onValueChange={handleBranchChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a branch" />
            <SelectContent>
              <SelectItem value="main">main</SelectItem>
            </SelectContent>
          </SelectTrigger>
        </Select>
      </div>
    </div>
  );
};

function RepoActions() {
  const uploadDocuments = useUploadDocuments();
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
  const branch = useMemo(() => {
    return localStorage.getItem("selected-github-branch") || "main";
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={`sm:max-w-[800px] z-[60]`}
        aria-description="let's you add github repository to your chat"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <p>Add from GitHub</p>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 w-full flex flex-col gap-4">
          <RepoLoader branch={branch} />
          <FileTree />
          <RepoActions />
        </div>
      </DialogContent>
    </Dialog>
  );
};
