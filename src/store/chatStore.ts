import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";
import { atomWithStorage, selectAtom } from "jotai/utils";
import type { MCPData } from "@/components/chat/panels/mcp/types";
import { useStream } from "@/hooks/chats/use-stream";
import { useCheckpointParser } from "@/hooks/chats/use-chats";
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
export const useStreamAtom = atom<ReturnType<typeof useStream> | null>(null);
export const useCheckpointParserAtom = atom<ReturnType<
  typeof useCheckpointParser
> | null>(null);
export const selectedArtifactAtom = atom<Artifact | null>(null);

export const themeAtom = atomWithStorage("theme", "dark");

export type ChatInputState = {
  chatId: Id<"chats">;
  text: string;
  documents?: Id<"documents">[];
  model: string;
  projectId?: Id<"projects"> | null;
  agentMode: boolean;
  plannerMode: boolean;
  webSearch: boolean;
  artifacts?: boolean;
  streamId?: Id<"streams">;
};

const initialChatInputState: ChatInputState = {
  chatId: "" as Id<"chats">,
  documents: [],
  text: "",
  projectId: null,
  agentMode: false,
  plannerMode: false,
  webSearch: false,
  artifacts: false,
  model: "gemini-2.5-flash",
  streamId: "" as Id<"streams">,
};

export const chatInputAtom = atom<ChatInputState>(initialChatInputState);

export const updateChatInputAtom = atom(
  null,
  (get, set, update: Partial<ChatInputState>) => {
    set(chatInputAtom, {
      ...get(chatInputAtom),
      ...update,
    });
  }
);

export const resetChatInputAtom = atom(null, (_, set) => {
  set(chatInputAtom, initialChatInputState);
});

export const existingChatInputTextAtom = atom<string>("");
export const streamStatusAtom = selectAtom(
  useStreamAtom,
  (stream) => stream?.status
);
