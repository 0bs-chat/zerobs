import { useAtom, useSetAtom } from "jotai";
import { useCallback, useRef } from "react";

import type {
  RepoItem,
  ParsedRepoUrl,
  RepoStats,
  GitHubCombinedItems,
} from "./types";
import {
  githubCombinedItemsAtom,
  githubIsLoadingAtom,
  githubHasErrorAtom,
  githubErrorMessageAtom,
  githubCurrentRepoAtom,
  githubCurrentBranchAtom,
  githubAvailableBranchesAtom,
  clearAllSelectionsAtom,
} from "@/store/github";
import { createGitService } from "./git-service";

// ---------------------------------------------------------------------------
//  Runtime helpers
// ---------------------------------------------------------------------------
const isClient = typeof window !== "undefined";

type GitService = Awaited<ReturnType<typeof createGitService>>;

async function getFs() {
  if (!isClient) throw new Error("Filesystem unavailable on the server");
  // Memoise the Lightning-FS instance
  const globalAny = globalThis as any;
  if (!globalAny.__githubFs) {
    const { default: LightningFS } = await import(
      /* webpackChunkName: "lightning-fs" */ "@isomorphic-git/lightning-fs"
    );
    globalAny.__githubFs = new LightningFS("github-repos");
  }
  return globalAny.__githubFs as any;
}

async function getGitService(ref: React.MutableRefObject<GitService | null>) {
  if (!ref.current) ref.current = await createGitService();
  return ref.current!;
}

// ---------------------------------------------------------------------------
//  Main hook
// ---------------------------------------------------------------------------
const useGithub = () => {
  // --------------------- Jotai state --------------------------------------
  const [combinedItems, setCombinedItems] = useAtom(githubCombinedItemsAtom);
  const [isLoading, setIsLoading] = useAtom(githubIsLoadingAtom);
  const [hasError, setHasError] = useAtom(githubHasErrorAtom);
  const [currentRepo, setCurrentRepo] = useAtom(githubCurrentRepoAtom);
  const [currentBranch, setCurrentBranch] = useAtom(githubCurrentBranchAtom);
  const [availableBranches, setAvailableBranches] = useAtom(
    githubAvailableBranchesAtom
  );
  const setErrorMessage = useSetAtom(githubErrorMessageAtom);
  const clearSelections = useSetAtom(clearAllSelectionsAtom);

  // --------------------- Git / FS refs ------------------------------------
  const gitServiceRef = useRef<GitService | null>(null);

  // ------------------------------------------------------------------------
  //  Helpers – signatures are unchanged from the original file
  // ------------------------------------------------------------------------

  /** Parse GitHub URL to extract owner, repo and branch. */
  const parseGitHubUrl = useCallback((url: string): ParsedRepoUrl | null => {
    try {
      const patterns = [
        /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/tree\/([^\/]+))?(?:\/.*)?$/,
        /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)$/,
        /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
        /^([^\/\s]+)\/([^\/\s]+)$/, // owner/repo
      ];
      for (const p of patterns) {
        const match = url.trim().match(p);
        if (match) {
          const [, owner, repo, branch] = match;
          return { owner: owner.trim(), repo: repo.trim(), branch };
        }
      }
      return null;
    } catch (err) {
      console.error("Error parsing GitHub URL:", err);
      return null;
    }
  }, []);

  /** Convert `<owner>/<repo>` to a local FS directory. */
  const getRepoPath = useCallback(
    (owner: string, repo: string) => `/${owner}/${repo}`,
    []
  );

  /** Check whether the repo has already been cloned locally. */
  const isRepoCloned = useCallback(
    async (owner: string, repo: string): Promise<boolean> => {
      try {
        const fs = await getFs();
        const stats = await fs.promises.stat(
          `${getRepoPath(owner, repo)}/.git`
        );
        return stats.isDirectory();
      } catch {
        return false;
      }
    },
    [getRepoPath]
  );

  /** Recursively delete a directory tree (used when switching repos). */
  const deleteDirectoryRecursive = async (dirPath: string) => {
    try {
      const fs = await getFs();
      const entries = await fs.promises.readdir(dirPath);
      for (const entry of entries) {
        const full = `${dirPath}/${entry}`;
        const stat = await fs.promises.stat(full).catch(() => null);
        if (stat?.isDirectory()) {
          await deleteDirectoryRecursive(full);
        } else {
          await fs.promises.unlink(full).catch(() => void 0);
        }
      }
      await fs.promises.rmdir(dirPath).catch(() => void 0);
    } catch {
      /* ignore */
    }
  };

  /** Clone a repo (depth-1, single branch) via the GitService wrapper. */
  const cloneRepository = useCallback(
    async (
      _url: string,
      owner: string,
      repo: string,
      branch: string = currentBranch
    ): Promise<void> => {
      const repoPath = getRepoPath(owner, repo);
      try {
        if (!isClient) {
          throw new Error("cloneRepository can only run in the browser");
        }

        // Ensure parent dir exists
        const fs = await getFs();
        await fs.promises.mkdir(`/${owner}`).catch(() => void 0);

        // Use the abstraction so we stay server-safe.
        const gitService = await getGitService(gitServiceRef);
        await gitService.clone({
          dir: repoPath,
          url: `https://github.com/${owner}/${repo}.git`,
        });

        // Checkout the desired branch (if not main)
        if (branch && branch !== "main") {
          const git = await import("isomorphic-git");
          await git.checkout({ fs, dir: repoPath, ref: branch });
        }
      } catch (error) {
        console.error(`Error cloning ${owner}/${repo}:`, error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    [currentBranch, getRepoPath]
  );

  /** Return basic stats for a file / dir. */
  const getFileStats = useCallback(
    async (
      repoPath: string,
      filePath: string
    ): Promise<{ isFile: boolean; size?: number }> => {
      try {
        const fs = await getFs();
        const stats = await fs.promises.stat(`${repoPath}/${filePath}`);
        return {
          isFile: stats.isFile(),
          size: stats.isFile() ? stats.size : 0,
        };
      } catch {
        return { isFile: false };
      }
    },
    []
  );

  /** Estimate token count (4 chars ≈ 1 token). */
  const calculateTokenCount = useCallback(
    async (repoPath: string, filePath: string) => {
      try {
        const fs = await getFs();
        const content = await fs.promises.readFile(
          `${repoPath}/${filePath}`,
          "utf8"
        );
        return Math.ceil(content.length / 4);
      } catch {
        return 0;
      }
    },
    []
  );

  /** Walk the repo tree (skips .git, node_modules, dot-files). */
  const walkDirectory = useCallback(
    async (repoPath: string, dirPath = "", depth = 0): Promise<RepoItem[]> => {
      const fs = await getFs();
      const items: RepoItem[] = [];
      const full = dirPath ? `${repoPath}/${dirPath}` : repoPath;

      const entries = await fs.promises.readdir(full).catch(() => []);
      for (const entry of entries) {
        if (
          entry === ".git" ||
          entry === "node_modules" ||
          entry.startsWith(".")
        )
          continue;

        const entryPath = dirPath ? `${dirPath}/${entry}` : entry;
        const { isFile, size } = await getFileStats(repoPath, entryPath);

        const item: RepoItem = {
          name: entry,
          path: entryPath,
          type: isFile ? "file" : "dir",
          size,
        };

        if (isFile) {
          item.tokenCount = await calculateTokenCount(repoPath, entryPath);
        }
        items.push(item);

        if (!isFile) {
          items.push(...(await walkDirectory(repoPath, entryPath, depth + 1)));
        }
      }
      return items;
    },
    [getFileStats, calculateTokenCount]
  );

  const enhanceItemsWithDepth = useCallback(
    (items: RepoItem[]) =>
      items.map((i) => ({ ...i, depth: i.path.split("/").length - 1 })),
    []
  );

  const calculateStats = useCallback((items: RepoItem[]): RepoStats => {
    let files = 0,
      dirs = 0,
      maxDepth = 0;
    for (const i of items) {
      i.type === "file" ? files++ : dirs++;
      maxDepth = Math.max(maxDepth, i.path.split("/").length - 1);
    }
    return {
      totalFiles: files,
      totalDirectories: dirs,
      maxDepth,
      truncated: false,
    };
  }, []);

  const getFileContent = useCallback(
    async (owner: string, repo: string, filePath: string) => {
      const fs = await getFs();
      return fs.promises.readFile(
        `${getRepoPath(owner, repo)}/${filePath}`,
        "utf8"
      );
    },
    [getRepoPath]
  );

  // ------------------------------------------------------------------------
  //  High-level public API
  // ------------------------------------------------------------------------

  const loadRepository = useCallback(
    async (url: string) => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
      clearSelections();

      try {
        const parsed = parseGitHubUrl(url);
        if (!parsed) throw new Error("Invalid GitHub URL format");

        const { owner, repo } = parsed;
        const targetBranch = parsed.branch ?? "main";

        // Clean previous repo if we are switching
        if (currentRepo && currentRepo !== url) {
          const prev = parseGitHubUrl(currentRepo);
          if (prev) {
            await deleteDirectoryRecursive(getRepoPath(prev.owner, prev.repo));
          }
        }

        setCurrentRepo(url);
        setCurrentBranch(targetBranch);

        const alreadyCloned = await isRepoCloned(owner, repo);
        if (!alreadyCloned) {
          await cloneRepository(url, owner, repo, targetBranch);
        } else {
          // Make sure we are on the right branch
          const git = await import("isomorphic-git");
          await git
            .checkout({
              fs: await getFs(),
              dir: getRepoPath(owner, repo),
              ref: targetBranch,
            })
            .catch(() => void 0);
        }

        const repoPath = getRepoPath(owner, repo);
        const items = await walkDirectory(repoPath);
        const combined: GitHubCombinedItems = {
          items: enhanceItemsWithDepth(items),
          isUsingFullDepth: true,
          isLoadingFullDepth: false,
          stats: calculateStats(items),
        };
        setCombinedItems(combined);
      } catch (err) {
        setHasError(true);
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [
      parseGitHubUrl,
      isRepoCloned,
      cloneRepository,
      walkDirectory,
      enhanceItemsWithDepth,
      calculateStats,
      getRepoPath,
      // atoms
      setIsLoading,
      setHasError,
      setErrorMessage,
      setCurrentRepo,
      setCurrentBranch,
      setCombinedItems,
      clearSelections,
      currentRepo,
    ]
  );

  const getBranches = useCallback(
    async (owner: string, repo: string): Promise<string[]> => {
      try {
        const git = await import("isomorphic-git");
        return await git.listBranches({
          fs: await getFs(),
          dir: getRepoPath(owner, repo),
        });
      } catch {
        return ["main"];
      }
    },
    [getRepoPath]
  );

  const getRepoBranches = useCallback(
    async (url?: string): Promise<string[]> => {
      const repoUrl = url ?? currentRepo;
      if (!repoUrl) return availableBranches;

      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) return availableBranches;

      const { owner, repo } = parsed;
      try {
        const git = await import("isomorphic-git");
        const httpMod = await import("isomorphic-git/http/web");
        const refs = await git.listServerRefs({
          http: httpMod,
          corsProxy: "https://cors.isomorphic-git.org",
          url: `https://github.com/${owner}/${repo}.git`,
        });

        const branches = refs
          .filter((r: any) => r.ref.startsWith("refs/heads/"))
          .map((r: any) => r.ref.replace("refs/heads/", ""))
          .sort();

        const result = branches.length ? branches : ["main"];
        setAvailableBranches(result);
        return result;
      } catch (err) {
        console.error("Error fetching branches:", err);
        return availableBranches;
      }
    },
    [parseGitHubUrl, currentRepo, availableBranches, setAvailableBranches]
  );

  const clearRepository = useCallback(() => {
    setCombinedItems({
      items: [],
      isUsingFullDepth: false,
      isLoadingFullDepth: false,
      stats: null,
    });
    setCurrentRepo("");
    setCurrentBranch("main");
    clearSelections();
    setHasError(false);
    setErrorMessage(null);
  }, [
    setCombinedItems,
    setCurrentRepo,
    setCurrentBranch,
    clearSelections,
    setHasError,
    setErrorMessage,
  ]);

  const combineSelectedFilesForChat = useCallback(
    async (selectedFilePaths: string[]) => {
      if (!currentRepo) throw new Error("No repository loaded");

      const parsed = parseGitHubUrl(currentRepo);
      if (!parsed) throw new Error("Invalid repository URL");

      const repoPath = getRepoPath(parsed.owner, parsed.repo);
      const fs = await getFs();

      let combined = `# Combined Files from GitHub Repository
Repository: ${parsed.owner}/${parsed.repo}
${parsed.branch ? `Branch: ${parsed.branch}\n` : ""}Source URL: ${currentRepo}

You can check the repository and these files at the above URL for more details.

## Files Included
${selectedFilePaths.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}

---

`;
      for (const filePath of selectedFilePaths) {
        try {
          const content = await fs.promises.readFile(
            `${repoPath}/${filePath}`,
            "utf8"
          );
          combined += `
============================================================
File: ${filePath}
GitHub URL: https://github.com/${parsed.owner}/${parsed.repo}/blob/${
            parsed.branch ?? "main"
          }/${filePath}
------------------------------------------------------------
${content}
============================================================
`;
        } catch {
          combined += `
============================================================
File: ${filePath}
[Error reading file]
============================================================
`;
        }
      }

      combined += `
---
End of combined file. Total files included: ${selectedFilePaths.length}

For more information, visit the repository: ${currentRepo}
`;

      return new File(
        [combined],
        `${parsed.owner}-${parsed.repo}-combined-${selectedFilePaths.length}-files.txt`,
        { type: "text/plain" }
      );
    },
    [currentRepo, parseGitHubUrl, getRepoPath]
  );

  // ------------------------------------------------------------------------
  //  Public API surface (unchanged)
  // ------------------------------------------------------------------------
  return {
    // State
    combinedItems,
    isLoading,
    hasError,
    currentRepo,
    currentBranch,
    availableBranches,

    // Actions
    loadRepository,
    getFileContent,
    getBranches,
    getRepoBranches,
    clearRepository,
    parseGitHubUrl,
    combineSelectedFilesForChat,
  };
};

export default useGithub;
