import { useAtomValue, useSetAtom } from "jotai";
import { useMutation } from "convex/react";
import { useParams } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  selectedProjectIdAtom,
  resizablePanelsOpenAtom,
  resizablePanelTabAtom,
} from "@/store/chatStore";

export const useSelectProject = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats"> | "new";
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);
  const setResizablePanelsOpen = useSetAtom(resizablePanelsOpenAtom);
  const setResizablePanelTab = useSetAtom(resizablePanelTabAtom);
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  const selectProject = async (projectId: Id<"projects"> | undefined) => {
    // Update the store atom
    setSelectedProjectId(projectId);
    
    // Update the chat input with the project ID
    await updateChatInputMutation({
      chatId,
      updates: {
        projectId,
      },
    });

    // If selecting a project (not clearing), open the projects panel
    if (projectId) {
      setResizablePanelTab("projects");
      setResizablePanelsOpen(true);
    }
  };

  const clearProject = () => {
    selectProject(undefined);
  };

  return {
    selectedProjectId,
    selectProject,
    clearProject,
  };
};