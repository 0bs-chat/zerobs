import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import FS from "@isomorphic-git/lightning-fs";
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

// Initialize the file system
const fs = new FS("github-repos");

const useGithub = () => {
  const [combinedItems, setCombinedItems] = useAtom(githubCombinedItemsAtom);
  const [isLoading, setIsLoading] = useAtom(githubIsLoadingAtom);
  const [hasError, setHasError] = useAtom(githubHasErrorAtom);
  const [currentRepo, setCurrentRepo] = useAtom(githubCurrentRepoAtom);
  const [currentBranch, setCurrentBranch] = useAtom(githubCurrentBranchAtom);
  const [availableBranches, setAvailableBranches] = useAtom(
    githubAvailableBranchesAtom,
  );
  const setErrorMessage = useSetAtom(githubErrorMessageAtom);
  const clearSelections = useSetAtom(clearAllSelectionsAtom);

  // Parse GitHub URL to extract owner, repo, and branch
  const parseGitHubUrl = useCallback((url: string): ParsedRepoUrl | null => {
    try {
      const patterns = [
        // Full GitHub URLs with optional branch
        /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/tree\/([^\/]+))?(?:\/.*)?$/,
        // Simple GitHub URLs
        /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)$/,
        // SSH format
        /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
        // Shorthand format: owner/repo
        /^([^\/\s]+)\/([^\/\s]+)$/,
      ];

      for (const pattern of patterns) {
        const match = url.trim().match(pattern);
        if (match) {
          const [, owner, repo, branch] = match;
          return {
            owner: owner.trim(),
            repo: repo.trim(),
            branch: branch?.trim(),
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error parsing GitHub URL:", error);
      return null;
    }
  }, []);

  // Get repository directory path
  const getRepoPath = useCallback((owner: string, repo: string) => {
    return `/${owner}/${repo}`;
  }, []);

  // Check if repository is already cloned
  const isRepoCloned = useCallback(
    async (owner: string, repo: string): Promise<boolean> => {
      try {
        const repoPath = getRepoPath(owner, repo);
        const stats = await fs.promises.stat(repoPath + "/.git");
        return stats.isDirectory();
      } catch {
        return false;
      }
    },
    [getRepoPath],
  );

  // Helper to recursively delete a directory and its contents
  const deleteDirectoryRecursive = async (dirPath: string) => {
    try {
      const entries = await fs.promises.readdir(dirPath);
      for (const entry of entries) {
        const fullPath = `${dirPath}/${entry}`;
        try {
          const stat = await fs.promises.stat(fullPath);
          if (stat.isDirectory()) {
            await deleteDirectoryRecursive(fullPath);
          } else {
            await fs.promises.unlink(fullPath);
          }
        } catch (err) {
          // Ignore errors for missing files
        }
      }
      await fs.promises.rmdir(dirPath);
    } catch (err) {
      // Ignore errors for missing directories
    }
  };

  // Clone repository
  const cloneRepository = useCallback(
    async (
      _url: string,
      owner: string,
      repo: string,
      branch: string = currentBranch,
    ): Promise<void> => {
      const repoPath = getRepoPath(owner, repo);

      try {
        // Check if Buffer is available
        if (typeof globalThis.Buffer === "undefined") {
          throw new Error(
            "Buffer is not available. Please ensure the Buffer polyfill is loaded.",
          );
        }

        // Ensure parent directory exists
        try {
          await fs.promises.mkdir(`/${owner}`);
        } catch {
          // Directory might already exist, ignore
        }

        await git.clone({
          fs,
          http,
          dir: repoPath,
          corsProxy: "https://cors.isomorphic-git.org",
          url: `https://github.com/${owner}/${repo}.git`,
          ref: branch,
          singleBranch: true,
          depth: 1,
        });
      } catch (error) {
        console.error(`Error cloning repository ${owner}/${repo}:`, error);

        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes("Buffer")) {
            throw new Error(
              "Missing Buffer dependency. Please ensure the application is properly configured with Buffer polyfill.",
            );
          } else if (error.message.includes("CORS")) {
            throw new Error(
              "CORS error when cloning repository. Please check the repository URL and your internet connection.",
            );
          } else if (error.message.includes("404")) {
            throw new Error(
              "Repository not found. Please check if the repository exists and is public.",
            );
          }
        }

        throw error;
      }
    },
    [getRepoPath],
  );

  // Get file/directory stats
  const getFileStats = useCallback(
    async (
      repoPath: string,
      filePath: string,
    ): Promise<{ isFile: boolean; size?: number }> => {
      try {
        const fullPath = `${repoPath}/${filePath}`;
        const stats = await fs.promises.stat(fullPath);
        return {
          isFile: stats.isFile(),
          size: stats.isFile() ? stats.size : undefined,
        };
      } catch {
        return { isFile: false };
      }
    },
    [],
  );

  // Calculate token count for a file
  const calculateTokenCount = useCallback(
    async (repoPath: string, filePath: string): Promise<number> => {
      try {
        const fullPath = `${repoPath}/${filePath}`;
        const content = await fs.promises.readFile(fullPath, "utf8");
        // Rough estimate: 4 characters per token
        return Math.ceil(content.length / 4);
      } catch (error) {
        console.error(`Error calculating tokens for ${filePath}:`, error);
        return 0;
      }
    },
    [],
  );

  // Walk directory tree and build file list
  const walkDirectory = useCallback(
    async (
      repoPath: string,
      dirPath: string = "",
      depth: number = 0,
    ): Promise<RepoItem[]> => {
      const items: RepoItem[] = [];
      const fullDirPath = dirPath ? `${repoPath}/${dirPath}` : repoPath;

      try {
        const entries = await fs.promises.readdir(fullDirPath);
        for (const entry of entries) {
          // Skip .git directory and other common ignore patterns
          if (
            entry === ".git" ||
            entry === "node_modules" ||
            entry.startsWith(".")
          ) {
            continue;
          }

          const entryPath = dirPath ? `${dirPath}/${entry}` : entry;
          const { isFile, size } = await getFileStats(repoPath, entryPath);

          const item: RepoItem = {
            name: entry,
            path: entryPath,
            type: isFile ? "file" : "dir",
            size,
          };

          // Calculate token count for files
          if (isFile) {
            item.tokenCount = await calculateTokenCount(repoPath, entryPath);
          }

          items.push(item);

          // Recursively walk subdirectories
          if (!isFile) {
            const subItems = await walkDirectory(
              repoPath,
              entryPath,
              depth + 1,
            );
            items.push(...subItems);
          }
        }
      } catch (error) {
        console.error(`Error walking directory ${fullDirPath}:`, error);
      }

      return items;
    },
    [getFileStats, calculateTokenCount],
  );

  // Enhance items with depth information
  const enhanceItemsWithDepth = useCallback((items: RepoItem[]): RepoItem[] => {
    return items.map((item) => ({
      ...item,
      depth: item.path.split("/").length - 1,
    }));
  }, []);

  // Calculate repository statistics
  const calculateStats = useCallback((items: RepoItem[]): RepoStats => {
    let totalFiles = 0;
    let totalDirectories = 0;
    let maxDepth = 0;

    for (const item of items) {
      if (item.type === "file") {
        totalFiles++;
      } else {
        totalDirectories++;
      }

      const depth = item.path.split("/").length - 1;
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      totalFiles,
      totalDirectories,
      maxDepth,
      truncated: false, // We're not implementing truncation for now
    };
  }, []);

  const getFileContent = useCallback(
    async (owner: string, repo: string, filePath: string): Promise<string> => {
      try {
        const repoPath = getRepoPath(owner, repo);
        const fullPath = `${repoPath}/${filePath}`;
        const content = await fs.promises.readFile(fullPath, "utf8");
        return content;
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        throw error;
      }
    },
    [getRepoPath],
  );

  // Main function to load repository
  const loadRepository = useCallback(
    async (url: string): Promise<void> => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
      clearSelections();

      try {
        const parsed = parseGitHubUrl(url);
        if (!parsed) {
          throw new Error("Invalid GitHub URL format");
        }

        const { owner, repo } = parsed;
        const targetBranch = parsed.branch || "main";

        // If we currently have a repo and are fetching another one, delete all contents of the previous one
        if (currentRepo && currentRepo !== url) {
          const prevParsed = parseGitHubUrl(currentRepo);
          if (prevParsed) {
            const prevRepoPath = getRepoPath(prevParsed.owner, prevParsed.repo);
            await deleteDirectoryRecursive(prevRepoPath);
          }
        }

        setCurrentRepo(url);
        setCurrentBranch(targetBranch);

        // Check if repo is already cloned
        const alreadyCloned = await isRepoCloned(owner, repo);

        if (!alreadyCloned) {
          await cloneRepository(url, owner, repo, targetBranch);
        } else {
          // For cached repos, make sure we're on the right branch
          try {
            await git.checkout({
              fs,
              dir: getRepoPath(owner, repo),
              ref: targetBranch,
            });
          } catch (error) {
            console.warn(error);
          }
        }

        // Walk the repository directory
        const repoPath = getRepoPath(owner, repo);

        const items = await walkDirectory(repoPath);
        const enhancedItems = enhanceItemsWithDepth(items);
        const stats = calculateStats(items);

        const combinedData: GitHubCombinedItems = {
          items: enhancedItems,
          isUsingFullDepth: true,
          isLoadingFullDepth: false,
          stats,
        };

        setCombinedItems(combinedData);
      } catch (error) {
        setHasError(true);
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
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
      setIsLoading,
      setHasError,
      setErrorMessage,
      setCurrentRepo,
      setCurrentBranch,
      setCombinedItems,
      clearSelections,
      currentRepo, // add currentRepo as dependency
    ],
  );

  const getBranches = useCallback(
    async (owner: string, repo: string): Promise<string[]> => {
      try {
        const repoPath = getRepoPath(owner, repo);
        const branches = await git.listBranches({ fs, dir: repoPath });
        return branches;
      } catch (error) {
        console.error("Error getting branches:", error);
        return ["main"];
      }
    },
    [getRepoPath],
  );

  // Fetch remote branches for a repository using isomorphic-git
  const getRepoBranches = useCallback(
    async (url?: string): Promise<string[]> => {
      const repoUrl = url || currentRepo;
      if (!repoUrl) {
        return availableBranches;
      }

      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) {
        return availableBranches;
      }

      const { owner, repo } = parsed;

      try {
        // Use isomorphic-git to fetch remote branches
        const remoteRefs = await git.listServerRefs({
          http,
          corsProxy: "https://cors.isomorphic-git.org",
          url: `https://github.com/${owner}/${repo}.git`,
        });

        // Filter to get only branch refs and extract branch names
        const branches = remoteRefs
          .filter((ref) => ref.ref.startsWith("refs/heads/"))
          .map((ref) => ref.ref.replace("refs/heads/", ""))
          .sort(); // Sort alphabetically

        const finalBranches = branches.length > 0 ? branches : ["main"];
        setAvailableBranches(finalBranches);
        return finalBranches;
      } catch (error) {
        console.error("Error fetching branches with isomorphic-git:", error);
        return availableBranches;
      }
    },
    [parseGitHubUrl, currentRepo, availableBranches, setAvailableBranches],
  );

  // Clear repository data
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
    async (selectedFilePaths: string[]): Promise<File> => {
      if (!currentRepo) throw new Error("No repository loaded");

      const parsed = parseGitHubUrl(currentRepo);
      if (!parsed) throw new Error("Invalid repository URL");

      const repoPath = getRepoPath(parsed.owner, parsed.repo);

      // Header: Describe the repository, branch, and source URL
      let combinedContent = `# Combined Files from GitHub Repository\n`;
      combinedContent += `Repository: ${parsed.owner}/${parsed.repo}\n`;
      if (parsed.branch) {
        combinedContent += `Branch: ${parsed.branch}\n`;
      }
      combinedContent += `Source URL: ${currentRepo}\n`;
      combinedContent += `\nYou can check the repository and these files at the above URL for more details.\n`;

      // List all file paths to be included
      combinedContent += `\n## Files Included\n`;
      selectedFilePaths.forEach((filePath, idx) => {
        combinedContent += `  ${idx + 1}. ${filePath}\n`;
      });

      combinedContent += `\n---\n\n`;

      // For each file, add a pretty section with filename, path, and content
      for (const filePath of selectedFilePaths) {
        try {
          const fullPath = `${repoPath}/${filePath}`;
          const content = await fs.promises.readFile(fullPath, "utf8");

          combinedContent += `\n============================================================\n`;
          combinedContent += `File: ${filePath}\n`;
          combinedContent += `Path in repo: ${fullPath}\n`;
          combinedContent += `GitHub URL: https://github.com/${parsed.owner}/${parsed.repo}/blob/${parsed.branch || "main"}/${filePath}\n`;
          combinedContent += `------------------------------------------------------------\n`;
          combinedContent += content;
          combinedContent += `\n============================================================\n`;
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
          combinedContent += `\n============================================================\n`;
          combinedContent += `File: ${filePath}\n`;
          combinedContent += `GitHub URL: https://github.com/${parsed.owner}/${parsed.repo}/blob/${parsed.branch || "main"}/${filePath}\n`;
          combinedContent += `[Error reading file]\n`;
          combinedContent += `============================================================\n`;
        }
      }

      // Add a summary at the end
      combinedContent += `\n---\nEnd of combined file. Total files included: ${selectedFilePaths.length}\n`;
      combinedContent += `\nFor more information, visit the repository: ${currentRepo}\n`;

      const fileName = `${parsed.owner}-${parsed.repo}-combined-${selectedFilePaths.length}-files.txt`;
      const file = new File([combinedContent], fileName, {
        type: "text/plain",
      });

      return file;
    },
    [currentRepo, parseGitHubUrl, getRepoPath],
  );

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
