import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { RepoItem } from "@/store/githubStore";
import { parseGitHubUrl, fetchFileContent } from "@/lib/github";

export interface GitHubRepoData {
  repoUrl: string;
  branch: string;
  selectedItems: RepoItem[];
  metadata: {
    owner: string;
    repo: string;
    timestamp: number;
    totalFiles: number;
    totalFolders: number;
  };
}

/**
 * Recursively finds all items in a tree structure
 */
const findAllItemsInTree = (
  items: RepoItem[],
  targetPaths: string[]
): RepoItem[] => {
  const foundItems: RepoItem[] = [];
  const targetPathSet = new Set(targetPaths);

  const searchItems = (itemList: RepoItem[]) => {
    for (const item of itemList) {
      if (targetPathSet.has(item.path)) {
        foundItems.push(item);
      }
      if (item.children) {
        searchItems(item.children);
      }
    }
  };

  searchItems(items);
  return foundItems;
};

/**
 * Recursively counts files and folders in selected items
 */
const countItemsRecursively = (
  items: RepoItem[]
): { files: number; folders: number } => {
  let files = 0;
  let folders = 0;

  for (const item of items) {
    if (item.type === "file") {
      files++;
    } else {
      folders++;
    }

    if (item.children) {
      const childCounts = countItemsRecursively(item.children);
      files += childCounts.files;
      folders += childCounts.folders;
    }
  }

  return { files, folders };
};

/**
 * Prepares selected GitHub repository items for storage
 */
export async function prepareGitHubData(
  repoUrl: string,
  branch: string,
  selectedItems: string[],
  allItems: RepoItem[]
): Promise<GitHubRepoData> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub URL");
  }

  // Find all selected items from the tree (including nested ones)
  const selectedRepoItems = findAllItemsInTree(allItems, selectedItems);

  // Process each selected item to ensure content is loaded for files
  const processedItems: RepoItem[] = [];

  for (const item of selectedRepoItems) {
    if (item.type === "file") {
      let itemWithContent = { ...item };

      // Fetch content if not already loaded
      if (!item.content) {
        try {
          const result = await fetchFileContent({
            repoFullName: `${parsed.owner}/${parsed.repo}`,
            branch: branch.trim(),
            filePath: item.path,
          });

          if (result.success && result.content) {
            itemWithContent.content = result.content;
            itemWithContent.size = result.size;
          }
        } catch (error) {
          console.error(`Failed to fetch content for ${item.path}:`, error);
        }
      }

      processedItems.push(itemWithContent);
    } else {
      // For directories, just store the metadata
      processedItems.push({ ...item });
    }
  }

  // Count all items recursively
  const counts = countItemsRecursively(processedItems);

  return {
    repoUrl,
    branch,
    selectedItems: processedItems,
    metadata: {
      owner: parsed.owner,
      repo: parsed.repo,
      timestamp: Date.now(),
      totalFiles: counts.files,
      totalFolders: counts.folders,
    },
  };
}

/**
 * Stores GitHub repository data as a document in Convex
 */
export async function storeGitHubAsDocument(
  repoData: GitHubRepoData,
  generateUploadUrl: ReturnType<
    typeof useMutation<typeof api.documents.mutations.generateUploadUrl>
  >,
  createDocuments: ReturnType<
    typeof useMutation<typeof api.documents.mutations.createMultiple>
  >
) {
  const currentDateTime = new Date().toLocaleString();
  const documentName = `${currentDateTime} - GitHub: ${repoData.metadata.owner}/${repoData.metadata.repo} (${repoData.branch})`;
  const jsonContent = JSON.stringify(repoData, null, 2);

  // Create a blob for the JSON content
  const blob = new Blob([jsonContent], { type: "application/json" });

  // Get upload URL from Convex
  const uploadUrl = await generateUploadUrl();

  // Upload the blob to Convex storage
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload GitHub data to storage");
  }

  const { storageId } = await uploadResponse.json();

  // Calculate size
  const size = blob.size;

  // Store as text document using the storage ID as the key
  const documentIds = await createDocuments({
    documents: [
      {
        name: documentName,
        type: "text",
        size,
        key: storageId, // Use the storage ID as the key
      },
    ],
  });

  return documentIds[0];
}

/**
 * Hook to store GitHub data as document
 */
export function useStoreGitHubAsDocument() {
  const generateUploadUrl = useMutation(
    api.documents.mutations.generateUploadUrl
  );
  const createDocuments = useMutation(api.documents.mutations.createMultiple);

  return async (
    repoUrl: string,
    branch: string,
    selectedItems: string[],
    allItems: RepoItem[]
  ) => {
    try {
      // Prepare the data
      const repoData = await prepareGitHubData(
        repoUrl,
        branch,
        selectedItems,
        allItems
      );

      // Store as document
      const documentId = await storeGitHubAsDocument(
        repoData,
        generateUploadUrl,
        createDocuments
      );

      return {
        success: true,
        documentId,
        message: `Successfully stored ${repoData.metadata.totalFiles} files and ${repoData.metadata.totalFolders} folders from ${repoData.metadata.owner}/${repoData.metadata.repo}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to store GitHub data",
      };
    }
  };
}

/**
 * Parses GitHub document data back to structured format
 */
export function parseGitHubDocument(jsonContent: string): GitHubRepoData {
  try {
    const data = JSON.parse(jsonContent);

    // Validate the structure
    if (
      !data.repoUrl ||
      !data.branch ||
      !data.selectedItems ||
      !data.metadata
    ) {
      throw new Error("Invalid GitHub document format");
    }

    return data as GitHubRepoData;
  } catch (error) {
    throw new Error(
      `Failed to parse GitHub document: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Utility to get summary of GitHub document
 */
export function getGitHubDocumentSummary(repoData: GitHubRepoData) {
  return {
    repository: `${repoData.metadata.owner}/${repoData.metadata.repo}`,
    branch: repoData.branch,
    totalFiles: repoData.metadata.totalFiles,
    totalFolders: repoData.metadata.totalFolders,
    timestamp: new Date(repoData.metadata.timestamp).toLocaleString(),
    fileList: repoData.selectedItems
      .filter((item) => item.type === "file")
      .map((item) => item.path),
    folderList: repoData.selectedItems
      .filter((item) => item.type === "dir")
      .map((item) => item.path),
  };
}
