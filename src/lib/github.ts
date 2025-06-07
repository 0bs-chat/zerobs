interface LoadRepositoryResult {
  success: boolean;
  message: string;
  contents?: Array<{
    name: string;
    path: string;
    type: "file" | "dir";
    size?: number; // File size in bytes
  }>;
}

interface FileContentResult {
  success: boolean;
  content?: string;
  message: string;
  size?: number;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

export const parseGitHubUrl = (
  url: string
): { owner: string; repo: string } | null => {
  try {
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^([^\/]+)\/([^\/]+)$/,
    ];
    for (const pattern of patterns) {
      const match = url.trim().match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ""),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Fetches the contents of a directory from a GitHub repository
 */
export const fetchDirectoryContents = async (args: {
  repoFullName: string;
  branch: string;
  dirPath: string;
}): Promise<LoadRepositoryResult> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${args.repoFullName}/contents/${args.dirPath}?ref=${args.branch}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Directory not found");
      }
      throw new Error("Failed to fetch directory contents");
    }

    const contentsRaw = await response.json();

    // Check if it's a directory (array of items)
    if (!Array.isArray(contentsRaw)) {
      throw new Error("Path is not a directory");
    }

    const contents = contentsRaw.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type as "file" | "dir",
      size: item.size || 0,
    }));

    return {
      success: true,
      message: `Successfully loaded directory "${args.dirPath}"`,
      contents,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch directory contents",
    };
  }
};

/**
 * Fetches the content of a specific file from a GitHub repository
 */
export const fetchFileContent = async (args: {
  repoFullName: string;
  branch: string;
  filePath: string;
}): Promise<FileContentResult> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${args.repoFullName}/contents/${args.filePath}?ref=${args.branch}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("File not found");
      }
      throw new Error("Failed to fetch file content");
    }

    const fileData = await response.json();

    // Check if it's a file (not a directory)
    if (fileData.type !== "file") {
      throw new Error("Path is not a file");
    }

    // Decode base64 content
    const content = atob(fileData.content.replace(/\s/g, ""));

    return {
      success: true,
      content,
      message: "File content fetched successfully",
      size: fileData.size || content.length,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch file content",
    };
  }
};

export const fetchBranches = async (args: {
  repoFullName: string;
}): Promise<Branch[]> => {
  const response = await fetch(
    `https://api.github.com/repos/${args.repoFullName}/branches`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found or is private");
    }
    throw new Error("Failed to fetch branches");
  }

  return response.json();
};

export const fetchBranchesFromUrl = async (url: string): Promise<string[]> => {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error("Invalid GitHub URL format");
  }

  const branches = await fetchBranches({
    repoFullName: `${parsed.owner}/${parsed.repo}`,
  });

  return branches.map((b) => b.name);
};

export const loadRepository = async (args: {
  repoFullName: string;
  branch: string;
}): Promise<LoadRepositoryResult> => {
  try {
    // Validate repository exists and is public
    const response = await fetch(
      `https://api.github.com/repos/${args.repoFullName}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Repository not found or is private");
      }
      throw new Error("Repository not accessible");
    }

    // Validate branch exists
    const branchResponse = await fetch(
      `https://api.github.com/repos/${args.repoFullName}/branches/${args.branch}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!branchResponse.ok) {
      if (branchResponse.status === 404) {
        throw new Error(`Branch "${args.branch}" not found`);
      }
      throw new Error(`Branch "${args.branch}" not accessible`);
    }

    // Fetch root directory contents
    const contentsResponse = await fetch(
      `https://api.github.com/repos/${args.repoFullName}/contents?ref=${args.branch}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!contentsResponse.ok) {
      throw new Error("Failed to fetch repository contents");
    }

    const contentsRaw = await contentsResponse.json();
    const contents = Array.isArray(contentsRaw)
      ? contentsRaw.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type, // "file" or "dir"
          size: item.size || 0, // File size in bytes
        }))
      : [];

    return {
      success: true,
      message: `Successfully loaded "${args.repoFullName}" from branch "${args.branch}"!`,
      contents,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load repository",
    };
  }
};
