import { create } from "zustand";

export type RepoItem = {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  tokens?: number;
  content?: string;
  children?: RepoItem[];
  expanded?: boolean;
  depth?: number;
  // New fields for better tracking
  isLoading?: boolean;
  childrenLoaded?: boolean;
};

interface GitHubStore {
  // Essential state only
  repoUrl: string;
  branch: string;
  branches: string[];
  items: RepoItem[];
  selectedItems: string[];

  // Simple loading states
  loading: boolean;
  loadingBranches: boolean;
  loadSuccess: boolean;

  // UI state
  expandedDirs: Set<string>;
  totalTokens: number;
  isDialogOpen: boolean;

  // Simple actions
  setRepoUrl: (url: string) => void;
  setBranch: (branch: string) => void;
  setBranches: (branches: string[]) => void;
  setItems: (items: RepoItem[]) => void;
  setSelectedItems: (items: string[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadingBranches: (loading: boolean) => void;
  setLoadSuccess: (success: boolean) => void;
  setExpandedDirs: (dirs: Set<string>) => void;
  setTotalTokens: (tokens: number) => void;
  setDialogOpen: (open: boolean) => void;

  // Utility actions
  toggleExpandedDir: (path: string) => void;
  addSelectedItem: (path: string) => void;
  removeSelectedItem: (path: string) => void;
  updateItemTokens: (path: string, tokens: number) => void;
  resetState: () => void;

  // New actions for better folder handling
  selectItemRecursively: (path: string) => void;
  deselectItemRecursively: (path: string) => void;
  updateItemChildren: (path: string, children: RepoItem[]) => void;
  setItemLoading: (path: string, loading: boolean) => void;
  getItemCounts: () => { totalFiles: number; totalFolders: number };
}

const initialState = {
  repoUrl: "",
  branch: "main",
  branches: [],
  items: [],
  selectedItems: [],
  loading: false,
  loadingBranches: false,
  loadSuccess: false,
  expandedDirs: new Set<string>(),
  totalTokens: 0,
  isDialogOpen: false,
};

// Utility functions
const findItemInTree = (items: RepoItem[], path: string): RepoItem | null => {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findItemInTree(item.children, path);
      if (found) return found;
    }
  }
  return null;
};

const getAllChildPaths = (item: RepoItem): string[] => {
  const paths: string[] = [];
  if (item.children) {
    for (const child of item.children) {
      paths.push(child.path);
      paths.push(...getAllChildPaths(child));
    }
  }
  return paths;
};

const updateItemInTree = (
  items: RepoItem[],
  path: string,
  updater: (item: RepoItem) => RepoItem
): RepoItem[] => {
  return items.map((item) => {
    if (item.path === path) {
      return updater(item);
    }
    if (item.children) {
      return {
        ...item,
        children: updateItemInTree(item.children, path, updater),
      };
    }
    return item;
  });
};

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

export const useGitHubStore = create<GitHubStore>((set, get) => ({
  ...initialState,

  // Simple setters
  setRepoUrl: (repoUrl) => set({ repoUrl }),
  setBranch: (branch) => set({ branch }),
  setBranches: (branches) => set({ branches }),
  setItems: (items) => set({ items }),
  setSelectedItems: (selectedItems) => set({ selectedItems }),
  setLoading: (loading) => set({ loading }),
  setLoadingBranches: (loadingBranches) => set({ loadingBranches }),
  setLoadSuccess: (loadSuccess) => set({ loadSuccess }),
  setExpandedDirs: (expandedDirs) => set({ expandedDirs }),
  setTotalTokens: (totalTokens) => set({ totalTokens }),
  setDialogOpen: (isDialogOpen) => set({ isDialogOpen }),

  // Simple utility actions
  toggleExpandedDir: (path) => {
    const { expandedDirs } = get();
    const newDirs = new Set(expandedDirs);
    if (newDirs.has(path)) {
      newDirs.delete(path);
    } else {
      newDirs.add(path);
    }
    set({ expandedDirs: newDirs });
  },

  addSelectedItem: (path) => {
    const { selectedItems } = get();
    if (!selectedItems.includes(path)) {
      set({ selectedItems: [...selectedItems, path] });
    }
  },

  removeSelectedItem: (path) => {
    const { selectedItems } = get();
    set({ selectedItems: selectedItems.filter((item) => item !== path) });
  },

  updateItemTokens: (path, tokens) => {
    const { items } = get();
    const updatedItems = updateItemInTree(items, path, (item) => ({
      ...item,
      tokens,
    }));
    set({ items: updatedItems });
  },

  // New actions for better folder handling
  selectItemRecursively: (path) => {
    const { items, selectedItems } = get();
    const item = findItemInTree(items, path);
    if (!item) return;

    const newSelectedItems = [...selectedItems];

    // Add the item itself if not already selected
    if (!newSelectedItems.includes(path)) {
      newSelectedItems.push(path);
    }

    // Add all children recursively
    const childPaths = getAllChildPaths(item);
    for (const childPath of childPaths) {
      if (!newSelectedItems.includes(childPath)) {
        newSelectedItems.push(childPath);
      }
    }

    set({ selectedItems: newSelectedItems });
  },

  deselectItemRecursively: (path) => {
    const { items, selectedItems } = get();
    const item = findItemInTree(items, path);
    if (!item) return;

    // Get all paths to remove (item + all children)
    const pathsToRemove = new Set([path, ...getAllChildPaths(item)]);

    const newSelectedItems = selectedItems.filter(
      (selectedPath) => !pathsToRemove.has(selectedPath)
    );

    set({ selectedItems: newSelectedItems });
  },

  updateItemChildren: (path, children) => {
    const { items } = get();
    const updatedItems = updateItemInTree(items, path, (item) => ({
      ...item,
      children,
      childrenLoaded: true,
      expanded: true,
    }));
    set({ items: updatedItems });
  },

  setItemLoading: (path, loading) => {
    const { items } = get();
    const updatedItems = updateItemInTree(items, path, (item) => ({
      ...item,
      isLoading: loading,
    }));
    set({ items: updatedItems });
  },

  getItemCounts: () => {
    const { items } = get();
    const counts = countItemsRecursively(items);
    return { totalFiles: counts.files, totalFolders: counts.folders };
  },

  resetState: () =>
    set({
      repoUrl: "",
      branch: "main",
      branches: [],
      items: [],
      selectedItems: [],
      loading: false,
      loadingBranches: false,
      loadSuccess: false,
      expandedDirs: new Set<string>(),
      totalTokens: 0,
      isDialogOpen: false,
    }),
}));

// Individual selector hooks for better performance
export const useRepoUrl = () => useGitHubStore((state) => state.repoUrl);
export const useBranch = () => useGitHubStore((state) => state.branch);
export const useBranches = () => useGitHubStore((state) => state.branches);
export const useItems = () => useGitHubStore((state) => state.items);
export const useSelectedItems = () =>
  useGitHubStore((state) => state.selectedItems);
export const useLoading = () => useGitHubStore((state) => state.loading);
export const useLoadingBranches = () =>
  useGitHubStore((state) => state.loadingBranches);
export const useLoadSuccess = () =>
  useGitHubStore((state) => state.loadSuccess);
export const useExpandedDirs = () =>
  useGitHubStore((state) => state.expandedDirs);
export const useTotalTokens = () =>
  useGitHubStore((state) => state.totalTokens);
export const useIsDialogOpen = () =>
  useGitHubStore((state) => state.isDialogOpen);

// Simple actions hook
export const useGitHubActions = () =>
  useGitHubStore((state) => ({
    setRepoUrl: state.setRepoUrl,
    setBranch: state.setBranch,
    setBranches: state.setBranches,
    setItems: state.setItems,
    setSelectedItems: state.setSelectedItems,
    setLoading: state.setLoading,
    setLoadingBranches: state.setLoadingBranches,
    setLoadSuccess: state.setLoadSuccess,
    setExpandedDirs: state.setExpandedDirs,
    setTotalTokens: state.setTotalTokens,
    setDialogOpen: state.setDialogOpen,
    toggleExpandedDir: state.toggleExpandedDir,
    addSelectedItem: state.addSelectedItem,
    removeSelectedItem: state.removeSelectedItem,
    updateItemTokens: state.updateItemTokens,
    selectItemRecursively: state.selectItemRecursively,
    deselectItemRecursively: state.deselectItemRecursively,
    updateItemChildren: state.updateItemChildren,
    setItemLoading: state.setItemLoading,
    getItemCounts: state.getItemCounts,
    resetState: state.resetState,
  }));
