import { atom } from "jotai";
import type { Id } from "../../convex/_generated/dataModel";
import { atomWithStorage, selectAtom } from "jotai/utils";
import { useStream } from "@/hooks/chats/use-stream";
import type { Artifact } from "@/components/artifacts/utils";
import { groupMessages } from "../../convex/chatMessages/helpers";
import type { ContentPart } from "@/components/artifacts/utils";
import { parseContent } from "@/components/artifacts/utils";

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

// --------------------------------
//   the new chat atom structure.
// --------------------------------

export const newChatTextAtom = atomWithStorage<string>("newChatText", "");
export const newChatDocumentsAtom = atom<Id<"documents">[]>([]);
export const newChatModelAtom = atomWithStorage<string>(
  "newChatModel",
  "gemini-2.5-flash"
);
export const newChatReasoningEffortAtom = atom<"low" | "medium" | "high">(
  "medium"
);

// independent atoms
export const newChatConductorModeAtom = atomWithStorage<boolean>(
  "newChatConductorMode",
  false
);
export const newChatOrchestratorModeAtom = atomWithStorage<boolean>(
  "newChatOrchestratorMode",
  false
);
export const newChatWebSearchAtom = atomWithStorage<boolean>(
  "newChatWebSearch",
  false
);

export const newChatArtifactsAtom = atomWithStorage<boolean>(
  "newChatArtifacts",
  false
);

export const selectedProjectIdAtom = atomWithStorage<Id<"projects"> | null>(
  "selectedProjectId",
  null
);
