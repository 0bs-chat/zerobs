import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";

export const resizablePanelsOpenAtom = atom(false);
export const sidebarAtom = atom(false);
export const selectedProjectIdAtom = atom<Id<"projects"> | undefined>(
  undefined
);
export const resizablePanelTabAtom = atom<
  "artifacts" | "projects" | "settings" | "mcp"
>("artifacts");
export const documentDialogOpenAtom = atom(false);
export const documentDialogDocumentIdAtom = atom<Id<"documents"> | undefined>(
  undefined
);
export const projectDialogOpenAtom = atom(false);
