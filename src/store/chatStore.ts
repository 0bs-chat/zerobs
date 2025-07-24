import { atom } from "jotai";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { atomWithStorage, selectAtom } from "jotai/utils";
import { useStream } from "@/hooks/chats/use-stream";
import type { Artifact } from "@/components/artifacts/utils";
import { groupMessages } from "../../convex/chatMessages/helpers";
import type { ContentPart } from "@/components/artifacts/utils";
import { parseContent } from "@/components/artifacts/utils";

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

export const groupedMessagesAtom = atom<
  ReturnType<typeof groupMessages> | undefined
>(undefined);
export const lastChatMessageAtom = atom<Id<"chatMessages"> | undefined>(
  undefined
);

export const useStreamAtom = atom<ReturnType<typeof useStream> | undefined>(
  undefined
);
export const streamStatusAtom = selectAtom(
  useStreamAtom,
  (stream) => stream?.status
);

// Create a more stable derived atom
export const allArtifactsAtom = atom((get) => {
  const artifacts: Artifact[] = [];

  const groupedMessages = get(groupedMessagesAtom);
  const streamData = get(useStreamAtom);

  // Only process if we have data
  if (!groupedMessages && !streamData?.chunkGroups) {
    return artifacts;
  }

  if (groupedMessages) {
    groupedMessages.forEach((group) => {
      group.response.forEach((responseMessage) => {
        const msg = responseMessage.message.message;
        if (msg.getType() === "ai") {
          const content = msg.content;
          if (typeof content === "string") {
            const parts = parseContent(content);
            const messageArtifacts = parts
              .filter(
                (part): part is Extract<ContentPart, { type: "artifact" }> =>
                  part.type === "artifact"
              )
              .map((part) => part.artifact);
            artifacts.push(...messageArtifacts);
          }
        }
      });
    });
  }

  if (streamData?.chunkGroups) {
    const streamContent = streamData.chunkGroups
      .filter((g) => g.type === "ai")
      .map((g) => (g.type === "ai" ? g.content : ""))
      .join("");
    const streamParts = parseContent(streamContent);
    const streamArtifacts = streamParts
      .filter(
        (part): part is Extract<ContentPart, { type: "artifact" }> =>
          part.type === "artifact"
      )
      .map((part) => part.artifact);

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
export const intitalMCPState = {
  name: "",
  type: "http" as McpType,
  command: "",
  url: "",
  dockerImage: "",
  dockerPort: 0,
  dockerCommand: "",
  restartOnNewChat: false,
  env: {},
  status: "creating" as const,
};

export const mcpBrowsePanelOpenAtom = atom(false);
export const mcpDialogOpenAtom = atom(false);

// Example MCP templates (static for now)
export type McpTemplate = Omit<
  Doc<"mcps">,
  "_id" | "_creationTime" | "userId" | "updatedAt" | "enabled"
> & {
  description: string;
  image: string;
  official: boolean;
};

export const selectedMCPTemplateAtom = atom<
  McpTemplate | typeof intitalMCPState
>(intitalMCPState);
