import { useAtomValue, useSetAtom } from "jotai";
import { useMutation } from "convex/react";
import { useParams } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  selectedProjectIdAtom,
  resizablePanelsOpenAtom,
  resizablePanelTabAtom,
  openedProjectIdAtom,
} from "@/store/chatStore";

export const useSelectProject = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats"> | "new";
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const setResizablePanelsOpen = useSetAtom(resizablePanelsOpenAtom);
  const setResizablePanelTab = useSetAtom(resizablePanelTabAtom);
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);
  const setOpenedProjectId = useSetAtom(openedProjectIdAtom);
  const handleProjectSelection = async (
    projectId: Id<"projects"> | undefined
  ) => {
    setSelectedProjectId(projectId);
    await updateChatInputMutation({
      chatId,
      updates: {
        projectId,
      },
    });

    if (projectId) {
      setResizablePanelTab("projects");
      setResizablePanelsOpen(true);
    }
  };

  const clearProject = () => {
    setOpenedProjectId(undefined);
    setResizablePanelsOpen(false);
  };

  const openProject = (projectId: Id<"projects">) => {
    setResizablePanelTab("projects");
    setResizablePanelsOpen(true);
    setOpenedProjectId(projectId);
  };

  const closeProject = () => {
    setOpenedProjectId(undefined);
  };

  return {
    selectedProjectId,
    handleProjectSelection,
    openProject,
    closeProject,
    clearProject,
  };
};
