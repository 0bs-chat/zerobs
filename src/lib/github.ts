export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  description?: string;
}

interface FetchRepositoriesResult {
  repos: GitHubRepo[];
  nextPageUrl: string | null;
}

interface LoadRepositoryResult {
  success: boolean;
  message: string;
}

export const fetchRepositories = async (args: {
  accessToken: string;
  url?: string;
}): Promise<FetchRepositoriesResult> => {
  const url =
    args.url ||
    "https://api.github.com/user/repos?sort=updated&per_page=10&type=all";

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch repositories");
  }

  const data = await response.json();
  const linkHeader = response.headers.get("Link");
  const links = linkHeader
    ? linkHeader.split(",").reduce(
        (acc, part) => {
          const match = part.match(/<([^>]+)>; rel=\"([^\"]+)\"/);
          if (match) acc[match[2]] = match[1];
          return acc;
        },
        {} as Record<string, string>
      )
    : {};
  const nextUrl = links.next || null;

  return {
    repos: data,
    nextPageUrl: nextUrl,
  };
};

export const loadRepository = async (args: {
  accessToken: string;
  repoFullName: string;
  branch: string;
}): Promise<LoadRepositoryResult> => {
  try {
    // Validate repository access
    const response = await fetch(
      `https://api.github.com/repos/${args.repoFullName}`,
      {
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Repository not accessible");
    }

    // Validate branch exists
    const branchResponse = await fetch(
      `https://api.github.com/repos/${args.repoFullName}/branches/${args.branch}`,
      {
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!branchResponse.ok) {
      throw new Error(`Branch "${args.branch}" not found`);
    }

    // Here you would implement the actual repository loading logic
    // For now, we'll just simulate success
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      success: true,
      message: `Successfully loaded "${args.repoFullName}" from branch "${args.branch}"!`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load repository",
    };
  }
};
