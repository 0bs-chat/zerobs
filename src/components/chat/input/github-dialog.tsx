import { useState, useEffect, useCallback } from "react";
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
import { Lock, GitBranch, Github, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  fetchRepositories,
  loadRepository,
  type GitHubRepo,
} from "@/lib/github";
import { useAuthToken } from "@convex-dev/auth/react";

interface GitHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
const CACHE_KEY = "fetched_github_repos_cache";

type CachedRepos = {
  repos: GitHubRepo[];
  timestamp: number;
  nextPageUrl: string | null;
  allLoaded?: boolean;
};

export const GitHubDialog = ({ open, onOpenChange }: GitHubDialogProps) => {
  const token = useAuthToken();
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [branch, setBranch] = useState<string>("main");
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const ghSecret = useQuery(api.apiKeys.queries.getFromName, { name: "github_access_token" });
  const isAuthenticated = !!ghSecret?.key;

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset form state when closing
        setSelectedRepo("");
        setBranch("main");
        setLoading(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Helper to load cache
  function loadCache(): CachedRepos | null {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as CachedRepos;
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }
    return null;
  }

  // Helper to save cache
  function saveCache(
    repos: GitHubRepo[],
    nextPageUrl: string | null,
    allLoaded: boolean
  ) {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        repos,
        timestamp: Date.now(),
        nextPageUrl,
        allLoaded,
      })
    );
  }

  const loadRepos = useCallback(
    async (forceRefresh = false) => {
      if (!ghSecret || !open) return;

      try {
        if (!forceRefresh) {
          const cached = loadCache();
          if (cached) {
            const isCacheValid = Date.now() - cached.timestamp < CACHE_DURATION;
            if (isCacheValid && Array.isArray(cached.repos)) {
              setRepos(cached.repos);
              setNextPageUrl(cached.nextPageUrl ?? null);
              // If allLoaded, don't show load more button
              if (cached.allLoaded) setNextPageUrl(null);
              return;
            }
          }
        }

        setLoadingRepos(true);
        toast.info("Fetching your GitHub repositories...");

        const result = await fetchRepositories({
          accessToken: ghSecret.key,
        });

        // If no next page, mark allLoaded
        saveCache(result.repos, result.nextPageUrl, !result.nextPageUrl);

        setRepos(result.repos);
        setNextPageUrl(result.nextPageUrl);
        if (!result.nextPageUrl) setNextPageUrl(null);
        toast.success(`Loaded ${result.repos.length} repositories!`);
      } catch (error) {
        toast.error("Failed to fetch repositories");
        setRepos([]);
        setNextPageUrl(null);
      } finally {
        setLoadingRepos(false);
      }
    },
    [ghSecret?.key, open]
  );

  const loadMoreRepos = useCallback(async () => {
    if (!nextPageUrl || loadingMore || !ghSecret?.key) return;
    setLoadingMore(true);
    try {
      const result = await fetchRepositories({
        accessToken: ghSecret.key,
        url: nextPageUrl,
      });

      setRepos((prev) => {
        const merged = [...prev, ...result.repos];
        // If no next page, mark allLoaded
        saveCache(merged, result.nextPageUrl, !result.nextPageUrl);
        return merged;
      });
      setNextPageUrl(result.nextPageUrl);
      if (!result.nextPageUrl) setNextPageUrl(null);
    } catch (error) {
      toast.error("Failed to load more repositories");
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageUrl, loadingMore, ghSecret?.key]);

  // Load repos when dialog opens and user is authenticated
  useEffect(() => {
    if (open && isAuthenticated) {
      loadRepos();
    }
  }, [open, isAuthenticated, loadRepos]);

  // Update branch when repo selection changes
  useEffect(() => {
    if (selectedRepo) {
      const repo = repos.find((r) => r.full_name === selectedRepo);
      if (repo) {
        setBranch(repo.default_branch || "main");
      }
    }
  }, [selectedRepo, repos]);

  const handleGitHubLogin = async () => {
    try {
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GITHUB_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_CONVEX_SITE_URL}/github_repo/callback&state=${token}`;
      
      toast.info("Redirecting to GitHub...");
    } catch (error) {
      console.error("GitHub sign-in error:", error);
      toast.error("Failed to sign in with GitHub");
    }
  };

  const handleLoadRepository = async () => {
    if (!selectedRepo) {
      toast.error("Please select a repository first.");
      return;
    }

    const repo = repos.find((r) => r.full_name === selectedRepo);
    if (!repo) {
      toast.error("Repository not found.");
      return;
    }

    if (!branch.trim()) {
      toast.error("Please enter a branch name.");
      return;
    }

    if (!ghSecret?.key) {
      toast.error("GitHub authentication required.");
      return;
    }

    try {
      setLoading(true);
      toast.info(
        `Loading repository "${repo.full_name}" from branch "${branch}"...`
      );

      const result = await loadRepository({
        accessToken: ghSecret.key,
        repoFullName: repo.full_name,
        branch: branch.trim(),
      });

      if (result.success) {
        toast.success(result.message);
        handleOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error loading repository:", error);
      toast.error("Failed to load repository");
    } finally {
      setLoading(false);
    }
  };

  // Authentication flow dialog
  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px] z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              Connect to GitHub
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to access your repositories.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleGitHubLogin} disabled={loading}>
              <Github className="w-4 h-4 mr-2" />
              Sign in with GitHub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Main repository selection dialog
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Github className="w-5 h-5" />
            Add from GitHub
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="repo-select">Select Repository</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger id="repo-select" className="flex-1">
                  <SelectValue placeholder="Choose a repository" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <div className="h-[300px] overflow-y-auto scrollbar-hide">
                    {loadingRepos ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm">Loading repositories...</span>
                      </div>
                    ) : repos.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No repositories found
                      </div>
                    ) : (
                      repos.map((repo) => (
                        <SelectItem key={repo.id} value={repo.full_name}>
                          <div className="flex items-center gap-2 w-full">
                            {repo.private && (
                              <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            )}
                            <div className="flex flex-col items-start min-w-0">
                              <span className="font-medium truncate">
                                {repo.name}
                              </span>
                              {repo.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {repo.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                    {/* Only show Load More if we have more to fetch */}
                    {nextPageUrl && (
                      <div className="flex items-center justify-center p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={loadMoreRepos}
                          disabled={loadingMore}
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Loading...
                            </>
                          ) : (
                            "Load More"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadRepos(true)}
                disabled={loadingRepos}
                title="Refresh repositories"
              >
                <RefreshCcw
                  className={`w-4 h-4 ${loadingRepos ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch-input">Branch</Label>
            <div className="relative">
              <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="branch-input"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLoadRepository}
            disabled={!selectedRepo || loading || loadingRepos}
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
