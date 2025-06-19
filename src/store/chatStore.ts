import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";
import { atomWithStorage } from "jotai/utils";
import type { MCPData } from "@/components/chat/panels/mcp/types";
import { useStream } from "@/hooks/chats/use-stream";
import { useCheckpointParser } from "@/hooks/chats/use-chats";
import type { Artifact } from "@/components/chat/artifacts/utils";

export const chatInputTextAtom = atom<string>("");

export const sidebarOpenAtom = atomWithStorage("sidebarOpen", false);

export const documentDialogOpenAtom = atom(false);
export const documentDialogDocumentIdAtom = atom<Id<"documents"> | null>(null);
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

export const rightPanelVisibilityAtom = atomWithStorage(
  "rightPanelVisibility",
  true
);
export const rightPanelActiveTabAtom = atomWithStorage(
  "rightPanelActiveTab",
  "projects"
);

export const rightPanelWidthAtom = atomWithStorage("rightPanelWidth", 40);

export const chatProjectIdAtom = atom<Id<"projects"> | undefined>(undefined);
export const useStreamAtom = atom<ReturnType<typeof useStream> | null>(null);
export const useCheckpointParserAtom = atom<ReturnType<
  typeof useCheckpointParser
> | null>(null);

export const selectedArtifactAtom = atom<Artifact | null>(null);

export const themeAtom = atomWithStorage("theme", "dark");
