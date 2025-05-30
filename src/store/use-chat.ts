import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";

export const useChat = create<{
  resizablePanelsOpen: boolean;
  setResizablePanelsOpen: (open: boolean) => void;

  selectedProjectId: Id<"projects"> | undefined;
  setSelectedProjectId: (projectId: Id<"projects">) => void;

  resizablePanelTab: "artifacts" | "projects" | "settings" | "mcp";
  setResizablePanelTab: (
    tab: "artifacts" | "projects" | "settings" | "mcp",
  ) => void;

  documentDialogOpen: boolean;
  setDocumentDialogOpen: (open: boolean) => void;

  documentDialogDocumentId: Id<"documents"> | undefined;
  setDocumentDialogDocumentId: (
    documentId: Id<"documents"> | undefined,
  ) => void;

  projectDialogOpen: boolean;
  setProjectDialogOpen: (open: boolean) => void;
}>((set) => ({
  resizablePanelsOpen: false,
  setResizablePanelsOpen: (open) => set({ resizablePanelsOpen: open }),

  selectedProjectId: undefined,
  setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),

  resizablePanelTab: "artifacts",
  setResizablePanelTab: (tab) => set({ resizablePanelTab: tab }),

  documentDialogOpen: false,
  setDocumentDialogOpen: (open) => set({ documentDialogOpen: open }),

  documentDialogDocumentId: undefined,
  setDocumentDialogDocumentId: (documentId) =>
    set({ documentDialogDocumentId: documentId }),

  projectDialogOpen: false,
  setProjectDialogOpen: (open) => set({ projectDialogOpen: open }),
}));
