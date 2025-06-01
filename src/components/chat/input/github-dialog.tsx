import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Lock, GitBranch, Github, Loader2 } from "lucide-react";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { toast } from "sonner";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  description?: string;
}

interface GitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GitHubDialog = ({ open, onOpenChange }: GitHubDialogProps) => {
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [branch, setBranch] = useState<string>("main");
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);

  const handleGitHubLogin = () => {
    // TODO: Implement sign in with GitHub
    // signIn("github");
    toast.success("Signing in with GitHub");
  };

  const handleLoadRepository = async () => {
    if (!selectedRepo) return;

    const repo = repos.find((r) => r.full_name === selectedRepo);
    if (!repo) return;

    try {
      setLoading(true);
      const loader = new GithubRepoLoader(repo.html_url, {
        branch: branch || repo.default_branch,
        recursive: true,
        unknown: "warn",
        maxConcurrency: 5,
      });

      const docs = await loader.load();
      console.log(`Loaded ${docs.length} documents from ${repo.full_name}`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error loading repository:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedRepoData = repos.find((r) => r.full_name === selectedRepo);

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              Connect to GitHub
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to access repositories and load them
              into your chat.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleGitHubLogin}>Sign in with GitHub</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Add from GitHub
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Repository</Label>
            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a repository" />
              </SelectTrigger>
              <SelectContent>
                {loadingRepos ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  repos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.full_name}>
                      <div className="flex items-center gap-2">
                        {repo.private && (
                          <Lock className="w-3 h-3 text-amber-500" />
                        )}
                        <span>{repo.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Branch</Label>
            <div className="relative">
              <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder={selectedRepoData?.default_branch || "main"}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLoadRepository}
            disabled={!selectedRepo || loading}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
