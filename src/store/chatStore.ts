import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";
import { atomWithStorage } from "jotai/utils";
import type { MCPData } from "@/components/chat/panels/mcp/types";

export const chatInputTextAtom = atomWithStorage<string>("chatInputText", "");

export const sidebarOpenAtom = atomWithStorage("sidebarOpen", false);

export const documentDialogOpenAtom = atom(false);
export const documentDialogDocumentIdAtom = atom<Id<"documents"> | undefined>(
  undefined,
);
export const projectDialogOpenAtom = atom(false);

export const mcpEditDialogOpenAtom = atom(false);
export const mcpAtom = atom<MCPData>({
  name: "",
  type: "sse",
  command: "",
  dockerImage: "",
  dockerPort: 8000,
  status: "creating",
  envVars: [{ key: "", value: "" }],
  url: "",
  enabled: true,
  restartOnNewChat: false,
});

export const wrapLongLinesAtom = atomWithStorage("wrapLongLines", true);

export const resizablePanelsOpenAtom = atomWithStorage(
  "resizablePanelsOpen",
  false,
);
export type TabValue = "artifacts" | "projects" | "mcp";
export const resizablePanelTabAtom = atomWithStorage<TabValue>(
  "resizablePanelTab",
  "mcp",
);
