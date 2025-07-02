import { atom } from "jotai";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { atomWithStorage } from "jotai/utils";
import type { MCPData } from "@/components/chat/panels/mcp/types";
import type { AIChunkGroup, ToolChunkGroup } from "@/hooks/chats/use-stream";
import type { Artifact } from "@/components/chat/artifacts/utils";

export const sidebarOpenAtom = atomWithStorage("sidebarOpen", false);

export const selectedChatIdAtom = atomWithStorage<Id<"chats"> | null>(
  "selectedChatId",
  null
);
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

export const wrapLongLinesAtom = atomWithStorage("wrapLongLines", false);

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
export const selectedArtifactAtom = atom<Artifact | null>(null);

export const themeAtom = atomWithStorage("theme", "dark");

export type ChatState = {
  name: string;
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  projectId: Id<"projects"> | null;
  conductorMode: boolean;
  deepSearchMode: boolean;
  webSearch: boolean;
  artifacts: boolean;
  text: string;
  documents: Id<"documents">[];
};

const initialChatState: ChatState = {
  name: "",
  model: "",
  reasoningEffort: "medium",
  projectId: null,
  conductorMode: false,
  deepSearchMode: false,
  webSearch: false,
  artifacts: false,
  text: "",
  documents: [],
};

export const chatAtom = atom<ChatState>(initialChatState);

export const updateChatAtom = atom(
  null,
  (get, set, update: Partial<ChatState>) => {
    set(chatAtom, {
      ...get(chatAtom),
      ...update,
    });
  }
);

export const resetChatAtom = atom(null, (_, set) => {
  set(chatAtom, initialChatState);
});

export const existingChatTextAtom = atom<string>("");
export const selectedArtifactIdAtom = atom<string | null>(null);

export const processedChunksAtom = atom<
  (AIChunkGroup | ToolChunkGroup)[] | null
>(null);

export const currentCursorAtom = atom<string | null>(null);

export const streamStatusAtom = atom<string | null>(null);

export const lastChatMessageAtom = atom<Doc<"chatMessages"> | null>(null);
