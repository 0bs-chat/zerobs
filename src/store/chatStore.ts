import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";
import { atomWithStorage } from "jotai/utils";
import type { MCPData } from "@/components/chat/panel/mcp/types";

export const resizablePanelsOpenAtom = atomWithStorage(
  "resizablePanelsOpen",
  false
);

export const sidebarOpenAtom = atomWithStorage("sidebarOpen", false);

export const selectedProjectIdAtom = atom<Id<"projects"> | undefined>(
  undefined
);
export const resizablePanelTabAtom = atomWithStorage<
  "mcp" | "artifacts" | "projects" | "settings"
>("resizablePanelTab", "mcp");

export const documentDialogOpenAtom = atom(false);
export const documentDialogDocumentIdAtom = atom<Id<"documents"> | undefined>(
  undefined
);
export const projectDialogOpenAtom = atom(false);

// ================================
// mcp panel state
// ================================
export const mcpEditDialogOpenAtom = atom(false);
export const mcpEditDialogMcpIdAtom = atom<Id<"mcps"> | undefined>(undefined);
export const currentSelectedMcpAtom = atom<Id<"mcps"> | undefined>(undefined);

export const mcpAtom = atom<MCPData>({
  name: "",
  type: "sse",
  command: "",
  envVars: [{ key: "", value: "" }],
  url: "",
  enabled: false,
  resetOnNewChat: false,
});

// ================================
