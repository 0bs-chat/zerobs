import { atom } from "jotai";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { atomWithStorage, selectAtom, loadable } from "jotai/utils";
import { useStream } from "@/hooks/chats/use-stream";
import type { Artifact } from "@/components/artifacts/utils";
import { buildThread, groupMessages } from "../../convex/chatMessages/helpers";
import { parseArtifacts } from "@/components/artifacts/utils";
import { AIMessage } from "@langchain/core/messages";

export const userAtom = atom<Doc<"users">>();
export const userLoadableAtom = loadable(userAtom);

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
  orchestratorMode: false,
  webSearch: false,
  artifacts: false,
  updatedAt: 0,
  public: false,
});
export const chatAtom = atom<Doc<"chats">>();
export const chatIdAtom = selectAtom(chatAtom, (chat) => chat?._id!);

export const sidebarOpenAtom = atomWithStorage("sidebarOpen", false);

export const resizePanelOpenAtom = atomWithStorage("resizePanelOpen", false);
export const selectedPanelTabAtom = atomWithStorage(
  "selectedPanelTab",
  "projects"
);
export const resizePanelWidthAtom = atomWithStorage("resizePanelWidth", 40);

export const documentDialogOpenAtom = atom<Id<"documents"> | undefined>(
  undefined
);
export const createProjectDialogOpenAtom = atom(false);

export const wrapLongLinesAtom = atomWithStorage("wrapLongLines", false);

export const selectedProjectIdAtom = atom<Id<"projects"> | undefined>(
  undefined
);
export const selectedArtifactAtom = atom<Artifact | undefined>(undefined);
export const selectedVibzMcpAtom = atom<Doc<"mcps"> | undefined>(undefined);

export const pinnedChatsAccordionOpenAtom = atomWithStorage(
  "pinnedChatsAccordionOpen",
  false
);

export const currentThreadAtom = atom<
  ReturnType<typeof buildThread> | undefined
>(undefined);
export const groupedMessagesAtom = selectAtom(currentThreadAtom, (thread) =>
  thread ? groupMessages(thread) : []
);
export const lastChatMessageAtom = selectAtom(currentThreadAtom, (thread) =>
  thread && thread.length > 0
    ? thread[thread.length - 1].message._id
    : undefined
);

export const useStreamAtom = atom<ReturnType<typeof useStream> | undefined>(
  undefined
);
export const streamStatusAtom = selectAtom(
  useStreamAtom,
  (stream) => stream?.status
);

export const allArtifactsAtom = atom((get) => {
  const artifacts: Artifact[] = [];

  const groupedMessages = get(groupedMessagesAtom);
  const streamData = get(useStreamAtom);

  // Only process if we have data
  if (!groupedMessages && !streamData?.langchainMessages) {
    return artifacts;
  }

  if (groupedMessages) {
    groupedMessages.forEach((group) => {
      group.response.forEach((responseMessage) => {
        const msg = responseMessage.message.message;
        if (msg.getType() === "ai") {
          const content = msg.content;
          if (typeof content === "string") {
            const messageArtifacts = parseArtifacts(content);
            artifacts.push(...messageArtifacts);
          }
        }
      });
    });
  }

  if (streamData?.langchainMessages) {
    const streamContent = streamData.langchainMessages
      .filter((g) => g instanceof AIMessage)
      .map((g) => (g instanceof AIMessage ? g.content : ""))
      .join("");
    const streamArtifacts = parseArtifacts(streamContent);

    streamArtifacts.forEach((sa) => {
      if (!artifacts.find((a) => a.id === sa.id)) {
        artifacts.push(sa);
      }
    });
  }

  return artifacts;
});

// mcp atoms

export type McpType = "http" | "stdio" | "docker";
export const initialMCPState = {
  name: "",
  type: "http" as McpType,
  command: "",
  url: "",
  dockerImage: "",
  dockerPort: 8000,
  dockerCommand: "",
  env: {},
  status: "creating" as const,
  perChat: false,
  template: undefined as string | undefined,
};

export const mcpBrowsePanelOpenAtom = atom(false);
