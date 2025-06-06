import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";

export const useChatStore = create<{
  resizablePanelsOpen: boolean;
  sidebar: boolean;
  selectedProjectId: Id<"projects"> | undefined;
  resizablePanelTab: "artifacts" | "projects" | "settings" | "mcp";
  documentDialogOpen: boolean;
  documentDialogDocumentId: Id<"documents"> | undefined;
  projectDialogOpen: boolean;
  setResizablePanelsOpen: (open: boolean) => void;
  setSidebar: (open: boolean) => void;
  setSelectedProjectId: (projectId: Id<"projects">) => void;
  setResizablePanelTab: (
    tab: "artifacts" | "projects" | "settings" | "mcp"
  ) => void;
  setDocumentDialogOpen: (open: boolean) => void;
  setDocumentDialogDocumentId: (
    documentId: Id<"documents"> | undefined
  ) => void;
  setProjectDialogOpen: (open: boolean) => void;
}>((set) => ({
  resizablePanelsOpen: false,
  sidebar: false,
  selectedProjectId: undefined,
  resizablePanelTab: "artifacts",
  documentDialogOpen: false,
  documentDialogDocumentId: undefined,
  projectDialogOpen: false,
  setResizablePanelsOpen: (open) => set({ resizablePanelsOpen: open }),
  setSidebar: (open) => set({ sidebar: !open }),
  setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),
  setResizablePanelTab: (tab) => set({ resizablePanelTab: tab }),
  setDocumentDialogOpen: (open) => set({ documentDialogOpen: open }),
  setDocumentDialogDocumentId: (documentId) =>
    set({ documentDialogDocumentId: documentId }),
  setProjectDialogOpen: (open) => set({ projectDialogOpen: open }),
}));
