import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { projectDialogOpenAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useSelectProject } from "@/hooks/use-projects";
import { ProjectsList } from "./list";
import { ProjectDetails } from "./details";

export const ProjectsPanel = () => {
  const { selectedProjectId, selectProject } = useSelectProject();
  const setProjectDialogOpen = useSetAtom(projectDialogOpenAtom);

  const removeProject = useMutation(api.projects.mutations.remove);

  const showProjectList = !selectedProjectId;

  if (showProjectList) {
    return (
      <ProjectsList
        onSelect={(id) => selectProject(id)}
        onNewProject={() => setProjectDialogOpen(true)}
        onRemove={(id) => removeProject({ projectId: id })}
      />
    );
  }

  return (
    <ProjectDetails
      projectId={selectedProjectId as Id<"projects">}
      onBack={() => selectProject(undefined)}
    />
  );
};
