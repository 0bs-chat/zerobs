export interface RepoItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  depth?: number;
  tokenCount?: number;
}

export interface RepoStats {
  totalFiles: number;
  totalDirectories: number;
  maxDepth: number;
  truncated: boolean;
  truncationReason?: string;
}

export interface GitHubCombinedItems {
  items: RepoItem[];
  isUsingFullDepth: boolean;
  isLoadingFullDepth: boolean;
  stats: RepoStats | null;
}

export interface ParsedRepoUrl {
  owner: string;
  repo: string;
  branch?: string;
}

export interface RepoMetadata {
  url: string;
  owner: string;
  repo: string;
  branch: string;
  lastFetched: number;
  commitSha?: string;
}
