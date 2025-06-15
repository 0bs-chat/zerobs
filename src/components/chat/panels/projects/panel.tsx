import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { openedProjectIdAtom, projectDialogOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useSelectProject } from "@/hooks/use-projects";
import { ProjectsList } from "./list";
import { ProjectDetails } from "./details";

export const ProjectsPanel = () => {
  const { handleProjectSelection, closeProject, openProject } =
    useSelectProject();
  const setProjectDialogOpen = useSetAtom(projectDialogOpenAtom);
  const openedProjectId = useAtomValue(openedProjectIdAtom);
  const removeProject = useMutation(api.projects.mutations.remove);

  const showProjectList = !openedProjectId;

  if (showProjectList) {
    return (
      <ProjectsList
        onOpen={(id) => openProject(id)}
        onSelect={(id) => handleProjectSelection(id)}
        onNewProject={() => setProjectDialogOpen(true)}
        onRemove={(id) => {
          removeProject({ projectId: id });
          closeProject();
        }}
      />
    );
  }

  return (
    <ProjectDetails
      openedProjectId={openedProjectId as Id<"projects">}
      onBack={() => closeProject()}
    />
  );
};
