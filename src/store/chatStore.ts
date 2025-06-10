import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";
import { atomWithStorage } from "jotai/utils";

export const resizablePanelsOpenAtom = atomWithStorage(
  "resizablePanelsOpen",
  false
);

export const sidebarOpenAtom = atomWithStorage("sidebarOpen", false);

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
