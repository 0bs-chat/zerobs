import { atom } from "jotai";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { atomWithStorage, selectAtom } from "jotai/utils";
import { useStream } from "@/hooks/chats/use-stream";
import type { Artifact } from "@/components/chat/artifacts/utils";
import type { groupMessages } from "@/hooks/chats/use-messages";

export const newChatAtom = atomWithStorage<Doc<"chats">>("newChat", {
  _id: "new" as Id<"chats">,
  _creationTime: 0,
  userId: "",
  name: "New Chat",
  pinned: false,
  documents: [],
  text: "",
  model: "gemini-2.5-flash",
  reasoningEffort: "low",
  projectId: null,
  conductorMode: false,
  deepSearchMode: false,
  webSearch: false,
  artifacts: false,
  updatedAt: 0,
  public: false,
});

export const sidebarOpenAtom = atomWithStorage("sidebarOpen", false);

export const resizePanelOpenAtom = atomWithStorage("resizePanelOpen", false);
export const selectedPanelTabAtom = atomWithStorage("selectedPanelTab", "projects");
export const resizePanelWidthAtom = atomWithStorage("resizePanelWidth", 40);

export const documentDialogOpenAtom = atom<Id<"documents"> | null>(null);
export const createProjectDialogOpenAtom = atom(false);
export const createMCPServerDialogOpenAtom = atom(false);

export const wrapLongLinesAtom = atomWithStorage("wrapLongLines", false);

export const selectedProjectIdAtom = atom<Id<"projects"> | null>(null);
export const selectedArtifactAtom = atom<Artifact | null>(null);

export const groupedMessagesAtom = atom<ReturnType<typeof groupMessages> | null>(null);
export const useStreamAtom = atom<ReturnType<typeof useStream> | null>(null);
export const streamStatusAtom = selectAtom(
  useStreamAtom,
  (stream) => stream?.status,
);

export const lastChatMessageAtom = atom<Id<"chatMessages"> | undefined>(undefined);